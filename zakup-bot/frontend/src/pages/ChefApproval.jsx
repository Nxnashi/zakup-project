import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import { StatusBadge } from "./CookForm.jsx";

export default function ChefApproval({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [editedQty, setEditedQty] = useState({}); // orderId -> {productId: qty}

  function load() {
    setLoading(true);
    api.orders({ status: "pending" }).then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }

  useEffect(load, []);

  function setQty(orderId, productId, qty) {
    setEditedQty((prev) => ({
      ...prev,
      [orderId]: { ...(prev[orderId] || {}), [productId]: qty },
    }));
  }

  async function approve(order) {
    setBusyId(order.id);
    const overrides = editedQty[order.id];
    const items = overrides
      ? order.items.map((i) => ({
          product_id: i.product.id,
          qty: overrides[i.product.id] != null ? Number(overrides[i.product.id]) : i.qty,
        }))
      : null;
    try {
      await api.approveOrder(order.id, { decided_by_id: user.id, items });
      load();
    } catch (e) {
      alert("Ошибка: " + e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function reject(order) {
    const reason = window.prompt("Причина отклонения (необязательно):") || null;
    setBusyId(order.id);
    try {
      await api.rejectOrder(order.id, { decided_by_id: user.id, decision_comment: reason });
      load();
    } catch (e) {
      alert("Ошибка: " + e.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p style={{ color: "var(--text-secondary)" }}>Загрузка…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        Заявок на согласовании: {orders.length}
      </p>
      {orders.length === 0 && (
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Новых заявок нет.</p>
      )}
      {orders.map((o) => (
        <div key={o.id} style={{ border: "1px solid var(--border)", background: "var(--surface)", padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontWeight: 500, fontSize: 14 }}>
              {o.department.name} · {o.author.full_name}
            </span>
            {o.urgent ? (
              <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, background: "var(--danger-bg)", color: "var(--danger)" }}>
                Срочно
              </span>
            ) : (
              <StatusBadge status={o.status} />
            )}
          </div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
            {new Date(o.created_at).toLocaleString("ru-RU")}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {o.items.map((i) => (
              <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1, fontSize: 14 }}>{i.product.name}</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  defaultValue={i.qty}
                  onChange={(e) => setQty(o.id, i.product.id, e.target.value)}
                  style={{ width: 60, padding: 5, border: "1px solid var(--border)" }}
                />
                <span style={{ fontSize: 12, color: "var(--text-secondary)", width: 24 }}>{i.product.unit}</span>
              </div>
            ))}
          </div>
          {o.comment && (
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>
              Комментарий повара: {o.comment}
            </p>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => reject(o)}
              disabled={busyId === o.id}
              style={{ flex: 1, padding: 10, background: "var(--danger-bg)", color: "var(--danger)", border: "none" }}
            >
              Отклонить
            </button>
            <button
              onClick={() => approve(o)}
              disabled={busyId === o.id}
              style={{ flex: 1, padding: 10, background: "var(--accent)", color: "#fff", border: "none" }}
            >
              Утвердить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
