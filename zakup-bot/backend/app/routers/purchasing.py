from collections import defaultdict
from io import BytesIO
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from .. import models, schemas
from ..database import get_db

router = APIRouter()

TZ = ZoneInfo("Asia/Tashkent")
STATUS_LABELS = {"awaiting": "Ожидает", "received": "Приобретено"}


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


def _consolidated_lines(db: Session):
    """Группируем не по ID товара, а по названию (без регистра) — так одна и
    та же позиция, заведённая отдельно для разных цехов (например «Лимон»
    для кухни и «Лимон» для бара), сводится у закупщика в одну строку."""
    items = _approved_items_query(db).all()
    grouped = defaultdict(lambda: {"total_qty": 0.0, "by_department": defaultdict(float),
                                    "item_ids": [], "statuses": set(),
                                    "unit": None, "supplier": None})
    for it in items:
        key = it.product.name.strip().lower()
        g = grouped[key]
        g["name"] = it.product.name.strip()
        g["unit"] = g["unit"] or it.product.unit
        g["supplier"] = g["supplier"] or it.product.default_supplier
        g["total_qty"] += it.qty
        g["by_department"][it.order.department.name] += it.qty
        g["item_ids"].append(it.id)
        g["statuses"].add(it.purchase_status.value)

    result = []
    for key, g in grouped.items():
        overall = "received" if g["statuses"] == {"received"} else "awaiting"
        result.append(schemas.ConsolidatedLine(
            name=g["name"],
            unit=g["unit"],
            default_supplier=g["supplier"],
            total_qty=round(g["total_qty"], 3),
            by_department=dict(g["by_department"]),
            purchase_status=overall,
            item_ids=g["item_ids"],
        ))
    result.sort(key=lambda x: x.name)
    return result


@router.get("/consolidated", response_model=List[schemas.ConsolidatedLine])
def consolidated(db: Session = Depends(get_db)):
    return _consolidated_lines(db)


@router.get("/by-department", response_model=List[schemas.OrderOut])
def by_department(db: Session = Depends(get_db)):
    from .orders import _order_query, _serialize
    orders = (
        _order_query(db)
        .filter(models.Order.status == models.OrderStatus.approved)
        .order_by(models.Order.department_id, models.Order.created_at.desc())
        .all()
    )
    return [_serialize(o, db) for o in orders]


@router.get("/export-excel")
def export_excel(db: Session = Depends(get_db)):
    import openpyxl
    from openpyxl.styles import Font

    lines = _consolidated_lines(db)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Закупка"

    # Поставщик/склад — последней колонкой, чтобы не мешал основному списку
    headers = ["Наименование", "Кол-во", "Ед.изм", "По цехам", "Статус", "Поставщик"]
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True)

    for line in lines:
        by_dept = ", ".join(f"{dep} {qty}" for dep, qty in line.by_department.items())
        ws.append([
            line.name,
            line.total_qty,
            line.unit or "",
            by_dept,
            STATUS_LABELS.get(line.purchase_status, line.purchase_status),
            line.default_supplier or "",
        ])

    widths = [34, 8, 8, 30, 12, 14]
    for col, w in zip("ABCDEF", widths):
        ws.column_dimensions[col].width = w

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f"zakup-{datetime.now(TZ).strftime('%Y-%m-%d')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


class MarkAcquiredIn(BaseModel):
    item_ids: List[int]


@router.post("/mark-acquired")
def mark_acquired(payload: MarkAcquiredIn, db: Session = Depends(get_db)):
    if not payload.item_ids:
        raise HTTPException(400, "Пустой список позиций")
    items = db.query(models.OrderItem).filter(models.OrderItem.id.in_(payload.item_ids)).all()
    for it in items:
        it.purchase_status = models.ItemPurchaseStatus.received
    db.commit()
    return {"updated": len(items)}
