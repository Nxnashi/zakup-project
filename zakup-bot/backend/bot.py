import asyncio
import os
import logging

from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

logging.basicConfig(level=logging.INFO)

BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEBAPP_URL = os.getenv("FRONTEND_URL", "https://example.com")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


@dp.message(CommandStart())
async def start(message: Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="Открыть заявки", web_app=WebAppInfo(url=WEBAPP_URL))
    ]])
    await message.answer(
        "Привет! Это бот для заявок на закуп.\n"
        "Жми на кнопку, чтобы открыть заявки.",
        reply_markup=kb,
    )


async def main():
    if not BOT_TOKEN:
        raise RuntimeError("Задай переменную окружения BOT_TOKEN")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
