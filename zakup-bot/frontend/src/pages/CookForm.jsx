import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const statusMeta = {
  pending: { label: "На согласовании", bg: "var(--warning-bg)", fg: "var(--warning)" },
  approved: { label: "Утверждено", bg: "var(--success-bg)", fg: "var(--success)" },
  rejected: { label: "Отклонено", bg: "var(--danger-bg)", fg: "var(--danger)" },
};

export default function CookForm({ user }) {
  const [tab, setTab] = useState("new"); // new | history
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState({}); // product_id -> {product, qty, comment}
  const [urgent, setUrgent] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);

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
      api.orders({ author_id: user.id }).then(setHistory);
    }
  }, [tab, user.id]);

  const cartItems = useMemo(() => Object.values(cart), [cart]);

  function addToCart(product) {
    setCart((prev) => ({
      ...prev,
      [product.id]: prev[product.id] || { product, qty: 1, comment: "" },
    }));
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
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <TabButton active={tab === "new"} onClick={() => setTab("new")}>Новая заявка</TabButton>
        <TabButton active={tab === "history"} onClick={() => setTab("history")}>Мои заявки</TabButton>
      </div>

      {tab === "new" && (
        <>
          <input
            placeholder="Поиск позиции…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: 10, border: "1px solid var(--border)", marginBottom: 10 }}
          />

          {!search && (
            <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 10, paddingBottom: 4 }}>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  style={{
                    flexShrink: 0,
                    padding: "6px 12px",
                    fontSize: 13,
                    border: "1px solid var(--border)",
                    background: activeCategory === c.id ? "var(--accent)" : "var(--surface)",
                    color: activeCategory === c.id ? "#fff" : "var(--text)",
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}>
            {products.map((p) => (
              <div
                key={p.id}
                onClick={() => addToCart(p)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  border: "1px solid var(--border)",
                  background: cart[p.id] ? "var(--accent-bg)" : "var(--surface)",
                }}
              >
                <span style={{ fontSize: 14 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{p.unit}</span>
              </div>
            ))}
          </div>

          {cartItems.length > 0 && (
            <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>В заявке ({cartItems.length})</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cartItems.map(({ product, qty }) => (
                  <div key={product.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 14 }}>{product.name}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={qty}
                      onChange={(e) => updateQty(product.id, e.target.value)}
                      style={{ width: 64, padding: 6, border: "1px solid var(--border)" }}
                    />
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", width: 28 }}>{product.unit}</span>
                    <button onClick={() => removeFromCart(product.id)} style={{ border: "none", background: "none", color: "var(--danger)" }}>✕</button>
                  </div>
                ))}
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginTop: 12 }}>
                <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
                Срочная заявка
              </label>

              <textarea
                placeholder="Комментарий (необязательно)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{ width: "100%", marginTop: 8, padding: 8, border: "1px solid var(--border)", minHeight: 50 }}
              />

              <button
                onClick={submit}
                disabled={submitting}
                style={{
                  width: "100%",
                  marginTop: 12,
                  padding: 12,
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 500,
                }}
              >
                {submitting ? "Отправка…" : "Отправить на согласование"}
              </button>
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {history.length === 0 && <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Заявок пока нет.</p>}
          {history.map((o) => (
            <div key={o.id} style={{ border: "1px solid var(--border)", padding: "10px 12px", background: "var(--surface)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  {new Date(o.created_at).toLocaleString("ru-RU")}
                </span>
                <StatusBadge status={o.status} />
              </div>
              <p style={{ fontSize: 14, margin: 0 }}>
                {o.items.map((i) => i.product.name).join(", ")}
              </p>
              {o.decision_comment && (
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>
                  Комментарий: {o.decision_comment}
                </p>
              )}
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

export function StatusBadge({ status }) {
  const meta = statusMeta[status] || statusMeta.pending;
  return (
    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, background: meta.bg, color: meta.fg }}>
      {meta.label}
    </span>
  );
}
