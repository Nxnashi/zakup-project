import json
import os
from .database import SessionLocal, engine, Base
from . import models

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.Department).count() > 0:
            print("Already seeded, skipping.")
            return

        # Departments
        dept_names = ["Горячий цех", "Холодный цех", "Бар"]
        depts = {}
        for name in dept_names:
            d = models.Department(name=name)
            db.add(d)
            db.flush()
            depts[name] = d

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

        # Users
        with open(os.path.join(DATA_DIR, "users.json"), encoding="utf-8") as f:
            users = json.load(f)

        for u in users:
            dept_id = depts[u["department"]].id if u.get("department") else None
            db.add(models.User(
                full_name=u["full_name"],
                telegram_username=u["telegram_username"],
                role=u["role"],
                department_id=dept_id,
            ))

        db.commit()
        print(f"Seeded {len(dept_names)} departments, {len(categories)} categories, "
              f"{len(products)} products, {len(users)} users.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
