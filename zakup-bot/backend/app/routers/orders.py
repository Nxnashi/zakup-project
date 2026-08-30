import datetime
from zoneinfo import ZoneInfo
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from .. import models, schemas
from ..database import get_db

router = APIRouter()

TZ = ZoneInfo("Asia/Tashkent")


def _order_query(db: Session):
    return db.query(models.Order).options(
        joinedload(models.Order.department),
        joinedload(models.Order.author),
        joinedload(models.Order.decided_by),
        joinedload(models.Order.items).joinedload(models.OrderItem.product).joinedload(models.Product.category),
    )


def _edit_cutoff(db: Session) -> Optional[datetime.time]:
    row = db.query(models.Setting).filter(models.Setting.key == "order_edit_cutoff").first()
    if not row or not row.value:
        return None
    try:
        h, m = row.value.split(":")
        return datetime.time(int(h), int(m))
    except Exception:
        return None


def _is_editable(order: models.Order, db: Session) -> bool:
    if order.status != models.OrderStatus.pending:
        return False
    cutoff = _edit_cutoff(db)
    if cutoff is None:
        return True
    return datetime.datetime.now(TZ).time() < cutoff


def _serialize(order: models.Order, db: Session) -> models.Order:
    order.editable = _is_editable(order, db)
    return order


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

    for i, item in enumerate(payload.items):
        db.add(models.OrderItem(order_id=order.id, product_id=item.product_id,
                                 qty=item.qty, comment=item.comment, position=i))
    db.commit()
    db.refresh(order)
    return _serialize(_order_query(db).filter(models.Order.id == order.id).first(), db)


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
    orders = q.order_by(models.Order.created_at.desc()).all()
    return [_serialize(o, db) for o in orders]


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = _order_query(db).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Заявка не найдена")
    return _serialize(order, db)


@router.patch("/{order_id}", response_model=schemas.OrderOut)
def edit_order(order_id: int, payload: schemas.OrderEdit, db: Session = Depends(get_db)):
    """Повар правит свою же ещё не рассмотренную заявку — до дедлайна."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(404, "Заявка не найдена")
    if order.author_id != payload.author_id:
        raise HTTPException(403, "Редактировать может только автор заявки")
    if not _is_editable(order, db):
        raise HTTPException(400, "Заявку больше нельзя редактировать — дедлайн прошёл или она уже обработана")
    if not payload.items:
        raise HTTPException(400, "Заявка не может быть пустой")

    if payload.urgent is not None:
        order.urgent = 1 if payload.urgent else 0
    if payload.comment is not None:
        order.comment = payload.comment

    for old_item in list(order.items):
        db.delete(old_item)
    db.flush()
    for i, item in enumerate(payload.items):
        db.add(models.OrderItem(order_id=order.id, product_id=item.product_id,
                                 qty=item.qty, comment=item.comment, position=i))
    db.commit()
    return _serialize(_order_query(db).filter(models.Order.id == order_id).first(), db)


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
    return _serialize(_order_query(db).filter(models.Order.id == order_id).first(), db)


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
    return _serialize(_order_query(db).filter(models.Order.id == order_id).first(), db)
