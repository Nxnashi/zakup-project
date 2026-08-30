import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import StatusBadge from "../components/StatusBadge.jsx";
import SegmentedTabs from "../components/SegmentedTabs.jsx";
import OrderComposer from "../components/OrderComposer.jsx";
import OrderHistoryList from "../components/OrderHistoryList.jsx";

export default function ChefApproval({ user }) {
  const [tab, setTab] = useState("queue");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <SegmentedTabs
        tabs={[
          { value: "queue", label: "Согласование" },
          { value: "new", label: "Моя заявка" },
          { value: "history", label: "Мои заявки" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div style={{ marginTop: 16 }}>
        {tab === "queue" && (
          <div key="queue" className="fade-in">
            <ApprovalQueue user={user} />
          </div>
        )}

        {tab === "new" && (
          <div key="new" className="fade-in">
            <OrderComposer
              user={user}
              onSubmitted={() => {
                setRefreshKey((k) => k + 1);
                setTab("history");
              }}
            />
          </div>
        )}

        {tab === "history" && (
          <div key="history" className="fade-in">
            <OrderHistoryList user={user} refreshKey={refreshKey} />
          </div>
        )}
      </div>
    </div>
  );
}

function ApprovalQueue({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [editedQty, setEditedQty] = useState({});

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
      dismiss(order.id);
    } catch (e) {
      alert("Ошибка: " + e.message);
      setBusyId(null);
    }
  }

  async function reject(order) {
    const reason = window.prompt("Причина отклонения (необязательно):") || null;
    setBusyId(order.id);
    try {
      await api.rejectOrder(order.id, { decided_by_id: user.id, decision_comment: reason });
      dismiss(order.id);
    } catch (e) {
      alert("Ошибка: " + e.message);
      setBusyId(null);
    }
  }

  function dismiss(orderId) {
    setRemovingId(orderId);
    setTimeout(() => {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setBusyId(null);
      setRemovingId(null);
    }, 220);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="skeleton" style={{ height: 130 }} />
        <div className="skeleton" style={{ height: 130 }} />
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 12 }}>
        Заявок на согласовании: <strong style={{ color: "var(--ink)" }}>{orders.length}</strong>
      </p>
      {orders.length === 0 && (
        <div className="card" style={{ padding: "20px 16px", textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: 0 }}>Новых заявок нет — можно выдохнуть.</p>
        </div>
      )}
      <div className="stagger-list" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {orders.map((o) => (
          <div
            key={o.id}
            className="card"
            style={{
              padding: "13px 15px",
              transition: "opacity 220ms ease, transform 220ms ease",
              opacity: removingId === o.id ? 0 : 1,
              transform: removingId === o.id ? "translateX(24px) scale(0.98)" : "none",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 14.5 }}>
                {o.department.name} · {o.author.full_name}
              </span>
              {o.urgent ? (
                <span className="badge badge-danger">
                  <span className="badge-dot pulse-dot" />
                  Срочно
                </span>
              ) : (
                <StatusBadge status={o.status} />
              )}
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 10 }}>
              {new Date(o.created_at).toLocaleString("ru-RU")}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {o.items.map((i) => (
                <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 14 }}>{i.product.name}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    defaultValue={i.qty}
                    onChange={(e) => setQty(o.id, i.product.id, e.target.value)}
                    className="input"
                    style={{ width: 60, padding: "6px 7px", textAlign: "center" }}
                  />
                  <span style={{ fontSize: 12, color: "var(--ink-soft)", width: 24 }}>{i.product.unit}</span>
                </div>
              ))}
            </div>
            {o.comment && (
              <p style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 10, background: "var(--surface-2)", padding: "6px 9px", borderRadius: "var(--radius-sm)" }}>
                💬 {o.comment}
              </p>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => reject(o)} disabled={busyId === o.id} className="btn btn-danger" style={{ flex: 1, padding: 11 }}>
                Отклонить
              </button>
              <button onClick={() => approve(o)} disabled={busyId === o.id} className="btn btn-primary" style={{ flex: 1, padding: 11 }}>
                Утвердить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
