from collections import defaultdict
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from .. import models, schemas
from ..database import get_db

router = APIRouter()


def _approved_items_query(db: Session):
    return (
        db.query(models.OrderItem)
        .join(models.Order)
        .options(
            joinedload(models.OrderItem.product).joinedload(models.Product.category),
            joinedload(models.OrderItem.order).joinedload(models.Order.department),
        )
        .filter(models.Order.status == models.OrderStatus.approved)
    )


@router.get("/consolidated", response_model=List[schemas.ConsolidatedLine])
def consolidated(db: Session = Depends(get_db)):
    items = _approved_items_query(db).all()
    grouped = defaultdict(lambda: {"total_qty": 0.0, "by_department": defaultdict(float),
                                    "item_ids": [], "statuses": set(), "product": None})
    for it in items:
        g = grouped[it.product_id]
        g["product"] = it.product
        g["total_qty"] += it.qty
        g["by_department"][it.order.department.name] += it.qty
        g["item_ids"].append(it.id)
        g["statuses"].add(it.purchase_status.value)

    result = []
    for pid, g in grouped.items():
        statuses = g["statuses"]
        if statuses == {"received"}:
            overall = "received"
        elif statuses == {"ordered"} or statuses == {"ordered", "received"}:
            overall = "ordered"
        else:
            overall = "awaiting"
        result.append(schemas.ConsolidatedLine(
            product=g["product"],
            total_qty=round(g["total_qty"], 3),
            by_department=dict(g["by_department"]),
            purchase_status=overall,
            item_ids=g["item_ids"],
        ))
    result.sort(key=lambda x: x.product.name)
    return result


@router.get("/by-department", response_model=List[schemas.OrderOut])
def by_department(db: Session = Depends(get_db)):
    from .orders import _order_query
    return (
        _order_query(db)
        .filter(models.Order.status == models.OrderStatus.approved)
        .order_by(models.Order.department_id, models.Order.created_at.desc())
        .all()
    )


class MarkStatusIn(BaseModel):
    product_id: int
    status: str  # ordered | received


@router.post("/mark-status")
def mark_status(payload: MarkStatusIn, db: Session = Depends(get_db)):
    if payload.status not in ("ordered", "received"):
        raise HTTPException(400, "Некорректный статус")
    items = _approved_items_query(db).filter(models.OrderItem.product_id == payload.product_id).all()
    for it in items:
        it.purchase_status = payload.status
    db.commit()
    return {"updated": len(items)}
