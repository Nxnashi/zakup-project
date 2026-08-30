import datetime
from typing import Optional, List
from pydantic import BaseModel
from .models import RoleEnum, OrderStatus, ItemPurchaseStatus


class DepartmentOut(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True


class UserOut(BaseModel):
    id: int
    full_name: str
    telegram_username: str
    telegram_id: Optional[str] = None
    role: RoleEnum
    department: Optional[DepartmentOut] = None
    is_active: bool = True
    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    full_name: str
    telegram_username: str
    role: RoleEnum
    department_id: Optional[int] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    telegram_username: Optional[str] = None
    role: Optional[RoleEnum] = None
    department_id: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryOut(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True


class ProductOut(BaseModel):
    id: int
    name: str
    unit: Optional[str] = None
    default_supplier: Optional[str] = None
    category: CategoryOut
    departments: List[DepartmentOut] = []
    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    name: str
    unit: Optional[str] = None
    default_supplier: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None  # если новой категории ещё нет — создаём по имени
    department_ids: List[int] = []       # каким цехам видна эта позиция


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    default_supplier: Optional[str] = None
    category_id: Optional[int] = None
    department_ids: Optional[List[int]] = None


class OrderItemIn(BaseModel):
    product_id: int
    qty: float
    comment: Optional[str] = None


class OrderCreate(BaseModel):
    department_id: int
    author_id: int
    urgent: bool = False
    comment: Optional[str] = None
    items: List[OrderItemIn]


class OrderDecision(BaseModel):
    decided_by_id: int
    decision_comment: Optional[str] = None
    items: Optional[List[OrderItemIn]] = None  # если шеф корректирует количество перед утверждением


class OrderEdit(BaseModel):
    author_id: int  # для проверки, что редактирует именно автор заявки
    urgent: Optional[bool] = None
    comment: Optional[str] = None
    items: List[OrderItemIn]


class OrderItemOut(BaseModel):
    id: int
    product: ProductOut
    qty: float
    comment: Optional[str] = None
    purchase_status: ItemPurchaseStatus
    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    department: DepartmentOut
    author: UserOut
    status: OrderStatus
    urgent: bool
    comment: Optional[str] = None
    decision_comment: Optional[str] = None
    created_at: datetime.datetime
    decided_at: Optional[datetime.datetime] = None
    items: List[OrderItemOut]
    editable: bool = True  # можно ли ещё редактировать (до дедлайна и pending)
    class Config:
        from_attributes = True


class ConsolidatedLine(BaseModel):
    name: str
    unit: Optional[str] = None
    default_supplier: Optional[str] = None
    total_qty: float
    by_department: dict
    purchase_status: str
    item_ids: List[int]


class SettingsOut(BaseModel):
    order_edit_cutoff: Optional[str] = None  # "HH:MM" по Ташкенту, пусто = без дедлайна


class SettingsUpdate(BaseModel):
    order_edit_cutoff: Optional[str] = None


class TelegramAuthIn(BaseModel):
    init_data: str
