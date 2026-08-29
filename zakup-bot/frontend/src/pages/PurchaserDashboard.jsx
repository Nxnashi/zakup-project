import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import SegmentedTabs from "../components/SegmentedTabs.jsx";

const purchaseStatusMeta = {
  awaiting: { label: "Ожидает", cls: "badge-warning" },
  ordered: { label: "Заказано", cls: "badge-neutral" },
  received: { label: "Получено", cls: "badge-success" },
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

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="skeleton" style={{ height: 40, marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 76 }} />
        <div className="skeleton" style={{ height: 76 }} />
      </div>
    );
  }

  const grouped = byDept.reduce((acc, o) => {
    (acc[o.department.name] = acc[o.department.name] || []).push(o);
    return acc;
  }, {});

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <a href={api.exportExcelUrl()} className="btn" style={{ fontSize: 13, padding: "9px 13px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
          ⬇ Скачать Excel
        </a>
      </div>

      <SegmentedTabs
        tabs={[
          { value: "consolidated", label: "Консолидированно" },
          { value: "byDept", label: "По цехам" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div style={{ marginTop: 16 }}>
        {tab === "consolidated" && (
          <div key="consolidated" className="fade-in stagger-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {consolidated.length === 0 && (
              <div className="card" style={{ padding: "20px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: 0 }}>Утверждённых заявок пока нет.</p>
              </div>
            )}
            {consolidated.map((line) => {
              const meta = purchaseStatusMeta[line.purchase_status] || purchaseStatusMeta.awaiting;
              return (
                <div key={line.product.id} className="card" style={{ padding: "11px 13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{line.product.name}</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>
                      {line.total_qty} {line.product.unit}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 10px" }}>
                    {Object.entries(line.by_department).map(([dep, qty]) => `${dep} ${qty}`).join(" · ")}
                    {line.product.default_supplier ? ` · Пост.: ${line.product.default_supplier}` : ""}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className={`badge ${meta.cls}`}>
                      <span className="badge-dot" />
                      {meta.label}
                    </span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => markStatus(line.product.id, "ordered")}
                        disabled={line.purchase_status !== "awaiting"}
                        className="btn"
                        style={{ fontSize: 12, padding: "7px 11px" }}
                      >
                        Заказано
                      </button>
                      <button
                        onClick={() => markStatus(line.product.id, "received")}
                        disabled={line.purchase_status === "received"}
                        className="btn"
                        style={{ fontSize: 12, padding: "7px 11px" }}
                      >
                        Получено
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "byDept" && (
          <div key="byDept" className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {Object.keys(grouped).length === 0 && (
              <div className="card" style={{ padding: "20px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: 0 }}>Утверждённых заявок пока нет.</p>
              </div>
            )}
            {Object.entries(grouped).map(([dept, orders]) => (
              <div key={dept}>
                <p style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {dept}
                </p>
                <div className="stagger-list" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {orders.map((o) => (
                    <div key={o.id} className="card" style={{ padding: "9px 13px" }}>
                      <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 4px" }}>
                        {o.author.full_name} · {new Date(o.created_at).toLocaleDateString("ru-RU")}
                      </p>
                      {o.items.map((i) => (
                        <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                          <span>{i.product.name}</span>
                          <span style={{ fontWeight: 600 }}>{i.qty} {i.product.unit}</span>
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
    </div>
  );
}
