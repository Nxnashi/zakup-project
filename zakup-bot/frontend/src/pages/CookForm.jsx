import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import SegmentedTabs from "../components/SegmentedTabs.jsx";

export function StatusBadge({ status }) {
  const meta = {
    pending: { label: "На согласовании", cls: "badge-warning" },
    approved: { label: "Утверждено", cls: "badge-success" },
    rejected: { label: "Отклонено", cls: "badge-danger" },
  }[status] || { label: status, cls: "badge-neutral" };
  return (
    <span className={`badge ${meta.cls}`}>
      <span className="badge-dot" />
      {meta.label}
    </span>
  );
}

export default function CookForm({ user }) {
  const [tab, setTab] = useState("new");
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState({});
  const [urgent, setUrgent] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [justAdded, setJustAdded] = useState(null);

  useEffect(() => {
    api.categories().then((cats) => {
      setCategories(cats);
      if (cats.length) setActiveCategory(cats[0].id);
    });
  }, []);

  useEffect(() => {
    if (activeCategory == null && !search) return;
    const params = search ? { search } : { category_id: activeCategory };
    api.products(params).then(setProducts);
  }, [activeCategory, search]);

  useEffect(() => {
    if (tab === "history") {
      setHistoryLoading(true);
      api.orders({ author_id: user.id }).then((data) => {
        setHistory(data);
        setHistoryLoading(false);
      });
    }
  }, [tab, user.id]);

  const cartItems = useMemo(() => Object.values(cart), [cart]);

  function addToCart(product) {
    setCart((prev) => ({
      ...prev,
      [product.id]: prev[product.id] || { product, qty: 1, comment: "" },
    }));
    setJustAdded(product.id);
    setTimeout(() => setJustAdded(null), 380);
  }

  function updateQty(productId, qty) {
    setCart((prev) => ({ ...prev, [productId]: { ...prev[productId], qty } }));
  }

  function removeFromCart(productId) {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }

  async function submit() {
    if (!cartItems.length) return;
    setSubmitting(true);
    try {
      await api.createOrder({
        department_id: user.department.id,
        author_id: user.id,
        urgent,
        comment: comment || null,
        items: cartItems.map((i) => ({
          product_id: i.product.id,
          qty: Number(i.qty),
          comment: i.comment || null,
        })),
      });
      setCart({});
      setUrgent(false);
      setComment("");
      setTab("history");
    } catch (e) {
      alert("Не удалось отправить заявку: " + e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <SegmentedTabs
        tabs={[
          { value: "new", label: "Новая заявка" },
          { value: "history", label: "Мои заявки" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div style={{ marginTop: 16 }}>
        {tab === "new" && (
          <div key="new" className="fade-in">
            <input
              placeholder="Поиск позиции…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ marginBottom: 10 }}
            />

            {!search && (
              <div className="chip-row" style={{ marginBottom: 12 }}>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id)}
                    className={`chip ${activeCategory === c.id ? "active" : ""}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            <div className="scroll-area" style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
              {products.map((p) => (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="card card-interactive"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 13px",
                    background: cart[p.id] ? "var(--accent-soft)" : "var(--surface)",
                    borderColor: cart[p.id] ? "var(--accent-soft-strong)" : "var(--border)",
                    animation: justAdded === p.id ? "pop 320ms var(--ease-snap)" : "none",
                  }}
                >
                  <span style={{ fontSize: 14 }}>{p.name}</span>
                  <span style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>{p.unit}</span>
                </div>
              ))}
              {products.length === 0 && (
                <p style={{ color: "var(--ink-soft)", fontSize: 13, padding: "8px 2px" }}>Ничего не найдено.</p>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="scale-in" style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>В заявке ({cartItems.length})</p>
                <div className="stagger-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {cartItems.map(({ product, qty }) => (
                    <div key={product.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ flex: 1, fontSize: 14 }}>{product.name}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={qty}
                        onChange={(e) => updateQty(product.id, e.target.value)}
                        className="input"
                        style={{ width: 64, padding: "7px 8px", textAlign: "center" }}
                      />
                      <span style={{ fontSize: 12, color: "var(--ink-soft)", width: 26 }}>{product.unit}</span>
                      <button onClick={() => removeFromCart(product.id)} className="btn btn-ghost" style={{ padding: "6px 8px", color: "var(--danger)" }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, marginTop: 14, fontWeight: 500 }}>
                  <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
                  Срочная заявка
                </label>

                <textarea
                  placeholder="Комментарий (необязательно)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="input"
                  style={{ marginTop: 10, minHeight: 54, resize: "vertical" }}
                />

                <button onClick={submit} disabled={submitting} className="btn btn-primary" style={{ width: "100%", marginTop: 14, padding: 13 }}>
                  {submitting ? "Отправка…" : "Отправить на согласование"}
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div key="history" className="fade-in">
            {historyLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="skeleton" style={{ height: 66 }} />
                <div className="skeleton" style={{ height: 66 }} />
              </div>
            ) : (
              <div className="stagger-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {history.length === 0 && <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>Заявок пока нет.</p>}
                {history.map((o) => (
                  <div key={o.id} className="card" style={{ padding: "11px 13px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                        {new Date(o.created_at).toLocaleString("ru-RU")}
                      </span>
                      <StatusBadge status={o.status} />
                    </div>
                    <p style={{ fontSize: 14, margin: 0 }}>
                      {o.items.map((i) => i.product.name).join(", ")}
                    </p>
                    {o.decision_comment && (
                      <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
                        Комментарий: {o.decision_comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
