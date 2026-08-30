import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import StatusBadge from "./StatusBadge.jsx";

export default function OrderHistoryList({ user, refreshKey }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.orders({ author_id: user.id }).then((data) => {
      setHistory(data);
      setLoading(false);
    });
  }

  useEffect(load, [user.id, refreshKey]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="skeleton" style={{ height: 90 }} />
        <div className="skeleton" style={{ height: 90 }} />
      </div>
    );
  }

  return (
    <div className="stagger-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {history.length === 0 && <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>Заявок пока нет.</p>}
      {history.map((o) => (
        <HistoryOrderCard key={o.id} order={o} user={user} onChanged={(updated) => {
          setHistory((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
        }} />
      ))}
    </div>
  );
}

function HistoryOrderCard({ order, user, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState(order.items.map((i) => ({ ...i })));
  const [saving, setSaving] = useState(false);
  const canEdit = order.status === "pending" && order.editable;

  function updateQty(itemId, qty) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, qty } : i)));
  }
  function removeItem(itemId) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }
  function cancelEdit() {
    setItems(order.items.map((i) => ({ ...i })));
    setEditing(false);
  }
  async function save() {
    if (!items.length) {
      alert("В заявке должна остаться хотя бы одна позиция");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.editOrder(order.id, {
        author_id: user.id,
        items: items.map((i) => ({ product_id: i.product.id, qty: Number(i.qty), comment: i.comment || null })),
      });
      onChanged(updated);
      setEditing(false);
    } catch (e) {
      alert("Не получилось сохранить: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ padding: "11px 13px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
          {order.department?.name ? `${order.department.name} · ` : ""}
          {new Date(order.created_at).toLocaleString("ru-RU")}
        </span>
        <StatusBadge status={order.status} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: editing ? 10 : 0 }}>
        {(editing ? items : order.items).map((i) => (
          <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ flex: 1, fontSize: 14 }}>{i.product.name}</span>
            {editing ? (
              <>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={i.qty}
                  onChange={(e) => updateQty(i.id, e.target.value)}
                  className="input"
                  style={{ width: 60, padding: "6px 7px", textAlign: "center" }}
                />
                <span style={{ fontSize: 12, color: "var(--ink-soft)", width: 24 }}>{i.product.unit}</span>
                <button onClick={() => removeItem(i.id)} className="btn btn-ghost" style={{ padding: "5px 7px", color: "var(--danger)" }}>✕</button>
              </>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 600 }}>{i.qty} {i.product.unit}</span>
            )}
          </div>
        ))}
      </div>

      {order.decision_comment && !editing && (
        <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 8 }}>
          Комментарий: {order.decision_comment}
        </p>
      )}

      {canEdit && (
        editing ? (
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={cancelEdit} className="btn" style={{ flex: 1, padding: 9 }}>Отмена</button>
            <button onClick={save} disabled={saving} className="btn btn-primary" style={{ flex: 1, padding: 9 }}>
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="btn" style={{ marginTop: 10, fontSize: 12.5, padding: "7px 12px" }}>
            ✎ Изменить
          </button>
        )
      )}
    </div>
  );
}
