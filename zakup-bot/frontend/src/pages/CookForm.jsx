import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const [cart, setCart] = useState([]); // массив — порядок добавления, а не алфавит
  const [urgent, setUrgent] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [justAdded, setJustAdded] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const deptId = user.department?.id;

  useEffect(() => {
    api.categories().then((cats) => {
      setCategories(cats);
      if (cats.length) setActiveCategory(cats[0].id);
    });
  }, []);

  useEffect(() => {
    if (activeCategory == null && !search) return;
    const params = search ? { search, department_id: deptId } : { category_id: activeCategory, department_id: deptId };
    api.products(params).then(setProducts);
  }, [activeCategory, search, deptId]);

  useEffect(() => {
    if (tab === "history") {
      setHistoryLoading(true);
      api.orders({ author_id: user.id }).then((data) => {
        setHistory(data);
        setHistoryLoading(false);
      });
    }
  }, [tab, user.id]);

  function inCart(productId) {
    return cart.find((i) => i.product.id === productId);
  }

  function addToCart(product) {
    setCart((prev) => (prev.some((i) => i.product.id === product.id) ? prev : [...prev, { product, qty: 1, comment: "" }]));
    setJustAdded(product.id);
    setTimeout(() => setJustAdded(null), 380);
  }

  function updateQty(productId, qty) {
    setCart((prev) => prev.map((i) => (i.product.id === productId ? { ...i, qty } : i)));
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  // На iPhone внутри Telegram клавиатура иногда не скрывается сама —
  // прячем её при скролле списка и даём явную кнопку, если поиск пуст.
  function dismissKeyboard() {
    searchRef.current?.blur();
    document.activeElement?.blur?.();
  }

  async function submit() {
    if (!cart.length) return;
    setSubmitting(true);
    try {
      await api.createOrder({
        department_id: deptId,
        author_id: user.id,
        urgent,
        comment: comment || null,
        items: cart.map((i) => ({
          product_id: i.product.id,
          qty: Number(i.qty),
          comment: i.comment || null,
        })),
      });
      setCart([]);
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
            <div style={{ position: "relative", marginBottom: 10 }}>
              <input
                ref={searchRef}
                placeholder="Поиск позиции…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                inputMode="search"
                className="input"
                style={{ paddingRight: searchFocused ? 84 : 13 }}
              />
              {searchFocused && (
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={dismissKeyboard}
                  className="btn"
                  style={{ position: "absolute", right: 4, top: 4, bottom: 4, fontSize: 12, padding: "0 10px" }}
                >
                  Готово
                </button>
              )}
            </div>

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

            <div
              ref={listRef}
              onScroll={dismissKeyboard}
              className="scroll-area"
              style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 260, overflowY: "auto" }}
            >
              {products.map((p) => {
                const added = inCart(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="card card-interactive"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 13px",
                      background: added ? "var(--accent-soft)" : "var(--surface)",
                      borderColor: added ? "var(--accent-soft-strong)" : "var(--border)",
                      animation: justAdded === p.id ? "pop 320ms var(--ease-snap)" : "none",
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{p.name}</span>
                    <span style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 600 }}>{p.unit}</span>
                  </div>
                );
              })}
              {products.length === 0 && (
                <p style={{ color: "var(--ink-soft)", fontSize: 13, padding: "8px 2px" }}>Ничего не найдено.</p>
              )}
            </div>

            {cart.length > 0 && (
              <div className="scale-in" style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>В заявке ({cart.length})</p>
                <div className="stagger-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {cart.map(({ product, qty }) => (
                    <div key={product.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ flex: 1, fontSize: 14 }}>{product.name}</span>
                      <input
                        type="number"
                        inputMode="decimal"
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
                <div className="skeleton" style={{ height: 90 }} />
                <div className="skeleton" style={{ height: 90 }} />
              </div>
            ) : (
              <div className="stagger-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {history.length === 0 && <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>Заявок пока нет.</p>}
                {history.map((o) => (
                  <HistoryOrderCard key={o.id} order={o} user={user} onChanged={(updated) => {
                    setHistory((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
                  }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
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
