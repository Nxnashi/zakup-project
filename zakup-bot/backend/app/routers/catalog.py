from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from .. import models, schemas
from ..database import get_db

router = APIRouter()


@router.get("/departments", response_model=List[schemas.DepartmentOut])
def list_departments(db: Session = Depends(get_db)):
    return db.query(models.Department).all()


@router.get("/users", response_model=List[schemas.UserOut])
def list_users(role: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.User).options(joinedload(models.User.department))
    if role:
        q = q.filter(models.User.role == role)
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
    db.delete(user)
    db.commit()
    return {"deleted": True}


@router.get("/products", response_model=List[schemas.ProductOut])
def list_products(category_id: Optional[int] = None, search: Optional[str] = None,
                   db: Session = Depends(get_db)):
    q = db.query(models.Product).options(joinedload(models.Product.category))
    if category_id:
        q = q.filter(models.Product.category_id == category_id)
    if search:
        q = q.filter(models.Product.name.ilike(f"%{search}%"))
    return q.order_by(models.Product.name).all()


@router.get("/categories", response_model=List[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).order_by(models.Category.name).all()
