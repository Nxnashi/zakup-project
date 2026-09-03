"""
Разовая чистка номенклатуры: у ~128 позиций не было единицы измерения
(в оригинальном экселе они шли довеском в конце листа без заполненного
столбца «Ед.изм»), а часть хозтоваров (Азелит, тряпки, пакеты и т.п.)
была свалена в категорию «Бакалея и специи».

Правим по списку app/data/unit_category_fixes.json: проставляем единицу
измерения и, где нужно, переносим в правильную категорию (в т.ч. новую
«Хозтовары»).

Безопасно для повторного запуска: трогаем только те товары, у которых
единица измерения всё ещё пустая — если админ уже поправил позицию вручную
через панель, эта чистка её не тронет.
"""
import json
import os
from .database import SessionLocal
from . import models

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def apply_unit_category_fixes():
    path = os.path.join(DATA_DIR, "unit_category_fixes.json")
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        fixes = json.load(f)
    if not fixes:
        return

    db = SessionLocal()
    try:
        categories = {c.name: c for c in db.query(models.Category).all()}
        updated = 0
        for product in db.query(models.Product).filter(
            (models.Product.unit.is_(None)) | (models.Product.unit == "")
        ).all():
            fix = fixes.get(product.name)
            if not fix:
                continue
            product.unit = fix["unit"]
            cat_name = fix["category"]
            if cat_name not in categories:
                cat = models.Category(name=cat_name)
                db.add(cat)
                db.flush()
                categories[cat_name] = cat
            product.category_id = categories[cat_name].id
            updated += 1
        if updated:
            db.commit()
            print(f"Fixed unit/category for {updated} product(s).")
    finally:
        db.close()


def fix_admin_display_name():
    """Разовая правка: живой аккаунт (username pe2pac) был тестово назван
    "Гандон" и затем отключён при попытке удаления. Это тот же Telegram-
    аккаунт, что нужен владельцу для входа — переименовываем и включаем
    обратно, без ручных действий в интерфейсе."""
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.telegram_username == "pe2pac").first()
        if not user:
            return
        changed = False
        if user.full_name == "Гандон":
            user.full_name = "Администратор"
            changed = True
        if not user.is_active:
            user.is_active = 1
            changed = True
        if changed:
            db.commit()
            print("Fixed admin display name / reactivated pe2pac.")
    finally:
        db.close()
