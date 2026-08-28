import enum
import datetime
from sqlalchemy import (
    Column, Integer, String, ForeignKey, DateTime, Enum, Float, Text
)
from sqlalchemy.orm import relationship
from .database import Base


class RoleEnum(str, enum.Enum):
    cook = "cook"
    chef = "chef"          # шеф / су-шеф — согласующий, видит все цеха
    purchaser = "purchaser"
    admin = "admin"         # управляет пользователями и ролями


class OrderStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class ItemPurchaseStatus(str, enum.Enum):
    awaiting = "awaiting"   # заявка ещё не утверждена / утверждена, но не в закупке
    ordered = "ordered"
    received = "received"


class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

    users = relationship("User", back_populates="department")
    orders = relationship("Order", back_populates="department")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    full_name = Column(String, nullable=False)
    telegram_username = Column(String, unique=True, nullable=False)
    telegram_id = Column(String, unique=True, nullable=True)  # заполнится при первом входе через бота
    role = Column(Enum(RoleEnum), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)

    department = relationship("Department", back_populates="users")


class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)

    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    unit = Column(String, nullable=True)
    default_supplier = Column(String, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)

    category = relationship("Category", back_populates="products")


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.pending, nullable=False)
    urgent = Column(Integer, default=0)  # 0/1 срочность
    comment = Column(Text, nullable=True)
    decision_comment = Column(Text, nullable=True)
    decided_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    decided_at = Column(DateTime, nullable=True)

    department = relationship("Department", back_populates="orders")
    author = relationship("User", foreign_keys=[author_id])
    decided_by = relationship("User", foreign_keys=[decided_by_id])
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    qty = Column(Float, nullable=False)
    comment = Column(Text, nullable=True)
    purchase_status = Column(Enum(ItemPurchaseStatus), default=ItemPurchaseStatus.awaiting, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")
