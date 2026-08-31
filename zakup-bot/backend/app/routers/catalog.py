import hashlib
import hmac
import json
import os
import time
from typing import List, Optional
from urllib.parse import parse_qsl

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from .. import models, schemas
from ..database import get_db

router = APIRouter()

BOT_TOKEN = os.getenv("BOT_TOKEN", "")


# ---------- departments / users ----------

@router.get("/departments", response_model=List[schemas.DepartmentOut])
def list_departments(db: Session = Depends(get_db)):
    return db.query(models.Department).all()


@router.get("/users", response_model=List[schemas.UserOut])
def list_users(role: Optional[str] = None, telegram_id: Optional[str] = None,
                include_inactive: bool = False, db: Session = Depends(get_db)):
    q = db.query(models.User).options(joinedload(models.User.department))
    if role:
        q = q.filter(models.User.role == role)
    if telegram_id:
        q = q.filter(models.User.telegram_id == telegram_id)
    if not include_inactive:
        q = q.filter(models.User.is_active == 1)
    return q.order_by(models.User.role, models.User.full_name).all()


@router.post("/users", response_model=schemas.UserOut)
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    username = payload.telegram_username.lstrip("@").strip()
    if db.query(models.User).filter(models.User.telegram_username == username).first():
        raise HTTPException(400, "Пользователь с таким username уже существует")
    user = models.User(
        full_name=payload.full_name.strip(),
        telegram_username=username,
        role=payload.role,
        department_id=payload.department_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return db.query(models.User).options(joinedload(models.User.department)).filter(models.User.id == user.id).first()


@router.patch("/users/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: int, payload: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    data = payload.model_dump(exclude_unset=True)
    if "telegram_username" in data and data["telegram_username"]:
        data["telegram_username"] = data["telegram_username"].lstrip("@").strip()
    for field, value in data.items():
        setattr(user, field, value)
    db.commit()
    return db.query(models.User).options(joinedload(models.User.department)).filter(models.User.id == user_id).first()


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    # Жёсткое удаление невозможно, если человек фигурирует в истории заявок
    # (подавал их или утверждал) — база на это не даст пойти, да это и не
    # нужно: отключаем доступ, история остаётся как есть.
    has_orders = (
        db.query(models.Order)
        .filter((models.Order.author_id == user_id) | (models.Order.decided_by_id == user_id))
        .first()
    )
    if has_orders:
        user.is_active = 0
        db.commit()
        return {"deleted": False, "deactivated": True}
    db.delete(user)
    db.commit()
    return {"deleted": True, "deactivated": False}


class LinkTelegramIn(BaseModel):
    telegram_username: str
    telegram_id: str


@router.post("/users/link-telegram")
def link_telegram(payload: LinkTelegramIn, db: Session = Depends(get_db)):
    """Бот вызывает это при каждом /start, чтобы знать numeric chat_id
    пользователя — без него нельзя проактивно прислать файл."""
    username = payload.telegram_username.lstrip("@").strip()
    user = db.query(models.User).filter(models.User.telegram_username == username).first()
    if not user:
        return {"linked": False}
    user.telegram_id = payload.telegram_id
    db.commit()
    return {"linked": True}


# ---------- Telegram WebApp auth ----------

def _validate_telegram_init_data(init_data: str) -> dict:
    if not BOT_TOKEN:
        raise HTTPException(500, "BOT_TOKEN не задан на сервере")
    try:
        parsed = dict(parse_qsl(init_data, strict_parsing=True))
    except ValueError:
        raise HTTPException(400, "Некорректный initData")
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        raise HTTPException(400, "Отсутствует hash")
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))
    secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(computed_hash, received_hash):
        raise HTTPException(401, "Подпись Telegram не сошлась")
    auth_date = int(parsed.get("auth_date", 0))
    if auth_date and time.time() - auth_date > 86400:
        raise HTTPException(401, "initData устарел, перезайдите")
    return parsed


@router.post("/auth/telegram", response_model=schemas.UserOut)
def auth_telegram(payload: schemas.TelegramAuthIn, db: Session = Depends(get_db)):
    parsed = _validate_telegram_init_data(payload.init_data)
    user_json = parsed.get("user")
    if not user_json:
        raise HTTPException(400, "В initData нет данных пользователя")
    tg_user = json.loads(user_json)
    tg_id = str(tg_user["id"])
    tg_username = (tg_user.get("username") or "").strip()

    user = db.query(models.User).options(joinedload(models.User.department)).filter(
        models.User.telegram_id == tg_id
    ).first()

    if not user and tg_username:
        # первый вход — находим по username и привязываем numeric id
        user = db.query(models.User).options(joinedload(models.User.department)).filter(
            models.User.telegram_username == tg_username
        ).first()
        if user:
            user.telegram_id = tg_id
            db.commit()

    if not user:
        raise HTTPException(403, "Доступ не предоставлен — обратитесь к администратору")
    if not user.is_active:
        raise HTTPException(403, "Доступ отключён — обратитесь к администратору")

    return user


# ---------- categories ----------

@router.get("/categories", response_model=List[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).order_by(models.Category.name).all()


# ---------- products (ТМЦ) ----------

@router.get("/products", response_model=List[schemas.ProductOut])
def list_products(category_id: Optional[int] = None, search: Optional[str] = None,
                   department_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(models.Product).options(
        joinedload(models.Product.category), joinedload(models.Product.departments)
    )
    if category_id:
        q = q.filter(models.Product.category_id == category_id)
    if search:
        q = q.filter(models.Product.name.ilike(f"%{search}%"))
    if department_id:
        q = q.filter(models.Product.departments.any(models.Department.id == department_id))
    return q.order_by(models.Product.name).all()


def _get_or_create_category(db: Session, category_id: Optional[int], category_name: Optional[str]):
    if category_id:
        cat = db.query(models.Category).filter(models.Category.id == category_id).first()
        if not cat:
            raise HTTPException(404, "Категория не найдена")
        return cat
    if category_name:
        name = category_name.strip()
        cat = db.query(models.Category).filter(models.Category.name == name).first()
        if not cat:
            cat = models.Category(name=name)
            db.add(cat)
            db.flush()
        return cat
    raise HTTPException(400, "Укажи category_id или category_name")


@router.post("/products", response_model=schemas.ProductOut)
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    cat = _get_or_create_category(db, payload.category_id, payload.category_name)
    product = models.Product(
        name=payload.name.strip(),
        unit=payload.unit,
        default_supplier=payload.default_supplier,
        stock_qty=payload.stock_qty,
        category_id=cat.id,
    )
    if payload.department_ids:
        product.departments = db.query(models.Department).filter(
            models.Department.id.in_(payload.department_ids)
        ).all()
    db.add(product)
    db.commit()
    db.refresh(product)
    return db.query(models.Product).options(
        joinedload(models.Product.category), joinedload(models.Product.departments)
    ).filter(models.Product.id == product.id).first()


@router.patch("/products/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: int, payload: schemas.ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Позиция не найдена")
    data = payload.model_dump(exclude_unset=True)
    department_ids = data.pop("department_ids", None)
    for field, value in data.items():
        setattr(product, field, value)
    if department_ids is not None:
        product.departments = db.query(models.Department).filter(
            models.Department.id.in_(department_ids)
        ).all()
    db.commit()
    return db.query(models.Product).options(
        joinedload(models.Product.category), joinedload(models.Product.departments)
    ).filter(models.Product.id == product_id).first()


@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Позиция не найдена")
    db.delete(product)
    db.commit()
    return {"deleted": True}


# ---------- settings ----------

@router.get("/settings", response_model=schemas.SettingsOut)
def get_settings(db: Session = Depends(get_db)):
    row = db.query(models.Setting).filter(models.Setting.key == "order_edit_cutoff").first()
    return schemas.SettingsOut(order_edit_cutoff=row.value if row else None)


@router.patch("/settings", response_model=schemas.SettingsOut)
def update_settings(payload: schemas.SettingsUpdate, db: Session = Depends(get_db)):
    if payload.order_edit_cutoff is not None:
        row = db.query(models.Setting).filter(models.Setting.key == "order_edit_cutoff").first()
        value = payload.order_edit_cutoff.strip() or None
        if row:
            row.value = value
        else:
            db.add(models.Setting(key="order_edit_cutoff", value=value))
        db.commit()
    return get_settings(db)
