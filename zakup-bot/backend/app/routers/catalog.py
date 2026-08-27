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
    return q.all()


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
