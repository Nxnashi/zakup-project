import json
import os
from .database import SessionLocal, engine, Base
from . import models

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        already_seeded = db.query(models.Department).count() > 0

        if not already_seeded:
            # Departments
            dept_names = ["Горячий цех", "Холодный цех", "Бар"]
            for name in dept_names:
                db.add(models.Department(name=name))
            db.flush()

            # Products / categories
            with open(os.path.join(DATA_DIR, "products.json"), encoding="utf-8") as f:
                products = json.load(f)

            categories = {}
            for p in products:
                cat_name = p["category"]
                if cat_name not in categories:
                    c = models.Category(name=cat_name)
                    db.add(c)
                    db.flush()
                    categories[cat_name] = c
                db.add(models.Product(
                    name=p["name"],
                    unit=p.get("unit"),
                    default_supplier=p.get("supplier"),
                    category_id=categories[cat_name].id,
                ))
            db.flush()
            print(f"Seeded {len(dept_names)} departments, {len(categories)} categories, "
                  f"{len(products)} products.")
        else:
            print("Departments/products already seeded, skipping those.")

        # Users: всегда синхронизируем по telegram_username, чтобы новых людей
        # из users.json можно было добавлять простым редеплоем (админка тоже
        # умеет добавлять людей без редеплоя — это на случай bootstrap).
        depts = {d.name: d for d in db.query(models.Department).all()}
        with open(os.path.join(DATA_DIR, "users.json"), encoding="utf-8") as f:
            users = json.load(f)

        added = 0
        for u in users:
            exists = db.query(models.User).filter(
                models.User.telegram_username == u["telegram_username"]
            ).first()
            if exists:
                continue
            dept_id = depts[u["department"]].id if u.get("department") else None
            db.add(models.User(
                full_name=u["full_name"],
                telegram_username=u["telegram_username"],
                role=u["role"],
                department_id=dept_id,
            ))
            added += 1

        db.commit()
        if added:
            print(f"Added {added} new user(s) from users.json.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
