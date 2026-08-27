import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from .. import models, schemas
from ..database import get_db

router = APIRouter()


def _order_query(db: Session):
    return db.query(models.Order).options(
        joinedload(models.Order.department),
        joinedload(models.Order.author),
        joinedload(models.Order.decided_by),
        joinedload(models.Order.items).joinedload(models.OrderItem.product).joinedload(models.Product.category),
    )


@router.post("", response_model=schemas.OrderOut)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    if not payload.items:
        raise HTTPException(400, "Заявка не может быть пустой")

    order = models.Order(
        department_id=payload.department_id,
        author_id=payload.author_id,
        urgent=1 if payload.urgent else 0,
        comment=payload.comment,
        status=models.OrderStatus.pending,
    )
    db.add(order)
    db.flush()

    for item in payload.items:
        db.add(models.OrderItem(order_id=order.id, product_id=item.product_id,
                                 qty=item.qty, comment=item.comment))
    db.commit()
    db.refresh(order)
    return _order_query(db).filter(models.Order.id == order.id).first()


@router.get("", response_model=List[schemas.OrderOut])
def list_orders(status: Optional[str] = None, department_id: Optional[int] = None,
                 author_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = _order_query(db)
    if status:
        q = q.filter(models.Order.status == status)
    if department_id:
        q = q.filter(models.Order.department_id == department_id)
    if author_id:
        q = q.filter(models.Order.author_id == author_id)
    return q.order_by(models.Order.created_at.desc()).all()


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = _order_query(db).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Заявка не найдена")
    return order


@router.post("/{order_id}/approve", response_model=schemas.OrderOut)
def approve_order(order_id: int, payload: schemas.OrderDecision, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Заявка не найдена")
    if order.status != models.OrderStatus.pending:
        raise HTTPException(400, "Заявка уже обработана")

    # шеф может скорректировать количество перед утверждением
    if payload.items:
        by_product = {i.product_id: i for i in payload.items}
        for item in order.items:
            if item.product_id in by_product:
                item.qty = by_product[item.product_id].qty

    order.status = models.OrderStatus.approved
    order.decided_by_id = payload.decided_by_id
    order.decision_comment = payload.decision_comment
    order.decided_at = datetime.datetime.utcnow()
    db.commit()
    return _order_query(db).filter(models.Order.id == order_id).first()


@router.post("/{order_id}/reject", response_model=schemas.OrderOut)
def reject_order(order_id: int, payload: schemas.OrderDecision, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Заявка не найдена")
    if order.status != models.OrderStatus.pending:
        raise HTTPException(400, "Заявка уже обработана")

    order.status = models.OrderStatus.rejected
    order.decided_by_id = payload.decided_by_id
    order.decision_comment = payload.decision_comment
    order.decided_at = datetime.datetime.utcnow()
    db.commit()
    return _order_query(db).filter(models.Order.id == order_id).first()
