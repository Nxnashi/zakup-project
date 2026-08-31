"""
Разовая миграция для уже существующей базы: переводит колонки role/status/
purchase_status с жёсткого Postgres enum-типа на обычный VARCHAR, чтобы новые
значения (например новые роли) можно было добавлять без ALTER TYPE.

На SQLite это не требуется (там и так VARCHAR), функция там просто ничего
не делает. Безопасно запускать многократно — если колонка уже VARCHAR,
Postgres просто ничего не меняет.
"""
from sqlalchemy import text
from .database import engine, DATABASE_URL


MIGRATIONS = [
    "ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20) USING role::text",
    "ALTER TABLE orders ALTER COLUMN status TYPE VARCHAR(20) USING status::text",
    "ALTER TABLE order_items ALTER COLUMN purchase_status TYPE VARCHAR(20) USING purchase_status::text",
    "ALTER TABLE order_items ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0",
    # статус "ordered" убрали (осталась одна кнопка "Приобретено" = received)
    "UPDATE order_items SET purchase_status = 'received' WHERE purchase_status = 'ordered'",
    # "удаление" сотрудника теперь мягкое (is_active=0), чтобы не ломать
    # историю заявок, где он фигурирует как автор/утвердивший
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active INTEGER NOT NULL DEFAULT 1",
    # остаток на складе — задел под будущую интеграцию, пока вносится вручную
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_qty DOUBLE PRECISION",
]


def migrate_enum_columns_to_varchar():
    if not DATABASE_URL.startswith("postgresql"):
        return
    for stmt in MIGRATIONS:
        try:
            with engine.begin() as conn:
                conn.execute(text(stmt))
        except Exception as e:
            # Колонки может ещё не быть (первый деплой) — это нормально,
            # create_all создаст её сразу правильного типа.
            print(f"migrate skip: {stmt} -> {e}")
