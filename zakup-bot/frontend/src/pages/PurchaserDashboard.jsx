import React, { useEffect, useState } from "react";
import { api } from "../api/client";

const purchaseStatusMeta = {
  awaiting: { label: "Ожидает", bg: "var(--warning-bg)", fg: "var(--warning)" },
  ordered: { label: "Заказано", bg: "var(--accent-bg)", fg: "var(--accent)" },
  received: { label: "Получено", bg: "var(--success-bg)", fg: "var(--success)" },
};

export default function PurchaserDashboard() {
  const [tab, setTab] = useState("consolidated");
  const [consolidated, setConsolidated] = useState([]);
  const [byDept, setByDept] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([api.consolidated(), api.byDepartment()]).then(([c, d]) => {
      setConsolidated(c);
      setByDept(d);
      setLoading(false);
    });
  }

  useEffect(load, []);

  async function markStatus(productId, status) {
    await api.markStatus(productId, status);
    load();
  }

  if (loading) return <p style={{ color: "var(--text-secondary)" }}>Загрузка…</p>;

  const grouped = byDept.reduce((acc, o) => {
    (acc[o.department.name] = acc[o.department.name] || []).push(o);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <TabButton active={tab === "consolidated"} onClick={() => setTab("consolidated")}>
          Консолидированно
        </TabButton>
        <TabButton active={tab === "byDept"} onClick={() => setTab("byDept")}>
          По цехам
        </TabButton>
      </div>

      {tab === "consolidated" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {consolidated.length === 0 && (
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Утверждённых заявок нет.</p>
          )}
          {consolidated.map((line) => (
            <div key={line.product.id} style={{ border: "1px solid var(--border)", background: "var(--surface)", padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{line.product.name}</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>
                  {line.total_qty} {line.product.unit}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 8px" }}>
                {Object.entries(line.by_department).map(([dep, qty]) => `${dep} ${qty}`).join(" · ")}
                {line.product.default_supplier ? ` · Пост.: ${line.product.default_supplier}` : ""}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <StatusPill status={line.purchase_status} />
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => markStatus(line.product.id, "ordered")}
                    disabled={line.purchase_status !== "awaiting"}
                    style={{ fontSize: 12, padding: "6px 10px", border: "1px solid var(--border)", background: "var(--surface)" }}
                  >
                    Заказано
                  </button>
                  <button
                    onClick={() => markStatus(line.product.id, "received")}
                    disabled={line.purchase_status === "received"}
                    style={{ fontSize: 12, padding: "6px 10px", border: "1px solid var(--border)", background: "var(--surface)" }}
                  >
                    Получено
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "byDept" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {Object.keys(grouped).length === 0 && (
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Утверждённых заявок нет.</p>
          )}
          {Object.entries(grouped).map(([dept, orders]) => (
            <div key={dept}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{dept}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {orders.map((o) => (
                  <div key={o.id} style={{ border: "1px solid var(--border)", background: "var(--surface)", padding: "8px 12px" }}>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 4px" }}>
                      {o.author.full_name} · {new Date(o.created_at).toLocaleDateString("ru-RU")}
                    </p>
                    {o.items.map((i) => (
                      <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                        <span>{i.product.name}</span>
                        <span>{i.qty} {i.product.unit}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: 10,
        border: "1px solid var(--border)",
        background: active ? "var(--accent)" : "var(--surface)",
        color: active ? "#fff" : "var(--text)",
        fontSize: 14,
      }}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }) {
  const meta = purchaseStatusMeta[status] || purchaseStatusMeta.awaiting;
  return (
    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, background: meta.bg, color: meta.fg }}>
      {meta.label}
    </span>
  );
}
