import asyncio
import os
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import httpx
from aiogram import Bot, Dispatcher
from aiogram.filters import CommandStart, Command
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, BufferedInputFile

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("zakup-bot")

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEBAPP_URL = os.getenv("FRONTEND_URL", "https://example.com")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8010")
TZ = ZoneInfo("Asia/Tashkent")
DIGEST_HOUR = 21  # каждый день в 21:00 по Ташкенту

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


async def _link_telegram(username: str, user_id: int):
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"{BACKEND_URL}/users/link-telegram",
                json={"telegram_username": username, "telegram_id": str(user_id)},
            )
    except Exception:
        log.exception("link-telegram failed")


@dp.message(CommandStart())
async def start(message: Message):
    # Привязываем numeric chat_id к пользователю по его username — без этого
    # бот не может проактивно прислать файл, только username недостаточно
    # для отправки сообщений в Telegram.
    if message.from_user.username:
        await _link_telegram(message.from_user.username, message.from_user.id)

    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="Открыть заявки", web_app=WebAppInfo(url=WEBAPP_URL))
    ]])
    await message.answer(
        "Привет! Это бот для заявок на закуп.\n"
        "Жми на кнопку, чтобы открыть заявки.",
        reply_markup=kb,
    )


@dp.message(Command("report"))
async def report(message: Message):
    """Отдаёт Excel по утверждённым заявкам прямо в чат — надёжнее, чем
    скачивание по ссылке из Mini App (Telegram WebView его часто режет)."""
    if message.from_user.username:
        await _link_telegram(message.from_user.username, message.from_user.id)

    today = datetime.now(TZ).strftime("%d.%m.%Y")
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            consolidated_resp = await client.get(f"{BACKEND_URL}/purchasing/consolidated")
            lines = consolidated_resp.json()
        except Exception:
            log.exception("report: failed to fetch consolidated")
            await message.answer("Не получилось собрать отчёт, попробуй ещё раз чуть позже.")
            return

        if not lines:
            await message.answer(f"На {today} утверждённых заявок нет.")
            return

        try:
            excel_resp = await client.get(f"{BACKEND_URL}/purchasing/export-excel")
            file_bytes = excel_resp.content
        except Exception:
            log.exception("report: failed to fetch excel")
            await message.answer("Не получилось собрать файл, попробуй ещё раз чуть позже.")
            return

    filename = f"zakup-{datetime.now(TZ).strftime('%Y-%m-%d')}.xlsx"
    doc = BufferedInputFile(file_bytes, filename=filename)
    await message.answer_document(doc, caption=f"Заявка на базар — {today}")


async def send_daily_digest():
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.get(f"{BACKEND_URL}/users", params={"role": "purchaser"})
            purchasers = [u for u in resp.json() if u.get("telegram_id")]
        except Exception:
            log.exception("failed to fetch purchasers")
            return

        if not purchasers:
            log.info("no purchasers with linked telegram_id, skipping digest")
            return

        try:
            consolidated_resp = await client.get(f"{BACKEND_URL}/purchasing/consolidated")
            lines = consolidated_resp.json()
        except Exception:
            log.exception("failed to fetch consolidated list")
            return

        today = datetime.now(TZ).strftime("%d.%m.%Y")

        if not lines:
            for u in purchasers:
                try:
                    await bot.send_message(int(u["telegram_id"]), f"На {today} утверждённых заявок нет.")
                except Exception:
                    log.exception(f"failed to message purchaser {u['id']}")
            return

        try:
            excel_resp = await client.get(f"{BACKEND_URL}/purchasing/export-excel")
            file_bytes = excel_resp.content
        except Exception:
            log.exception("failed to fetch excel export")
            return

        filename = f"zakup-{datetime.now(TZ).strftime('%Y-%m-%d')}.xlsx"
        for u in purchasers:
            try:
                doc = BufferedInputFile(file_bytes, filename=filename)
                await bot.send_document(int(u["telegram_id"]), doc, caption=f"Заявка на базар — {today}")
            except Exception:
                log.exception(f"failed to send digest to purchaser {u['id']}")


async def daily_digest_loop():
    while True:
        now = datetime.now(TZ)
        target = now.replace(hour=DIGEST_HOUR, minute=0, second=0, microsecond=0)
        if now >= target:
            target += timedelta(days=1)
        wait_seconds = (target - now).total_seconds()
        log.info(f"next digest at {target.isoformat()} (in {int(wait_seconds)}s)")
        await asyncio.sleep(wait_seconds)
        try:
            await send_daily_digest()
        except Exception:
            log.exception("daily digest failed")
        await asyncio.sleep(5)  # уходим за пределы 21:00:00, чтобы не сработать дважды


async def main():
    if not BOT_TOKEN:
        raise RuntimeError("Задай переменную окружения BOT_TOKEN")
    await asyncio.gather(
        dp.start_polling(bot),
        daily_digest_loop(),
    )


if __name__ == "__main__":
    asyncio.run(main())
