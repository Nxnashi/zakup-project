import React, { useEffect, useRef, useState } from "react";
import { api } from "../api/client";

export default function OrderComposer({ user, fixedDepartmentId, onSubmitted }) {
  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState(fixedDepartmentId || "");
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]); // массив — порядок добавления, а не алфавит
  const [urgent, setUrgent] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justAdded, setJustAdded] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!fixedDepartmentId) api.departments().then(setDepartments);
  }, [fixedDepartmentId]);

  useEffect(() => {
    api.categories().then((cats) => {
      setCategories(cats);
      if (cats.length) setActiveCategory(cats[0].id);
    });
  }, []);

  useEffect(() => {
    if (!departmentId) { setProducts([]); return; }
    if (activeCategory == null && !search) return;
    const params = search
      ? { search, department_id: departmentId }
      : { category_id: activeCategory, department_id: departmentId };
    api.products(params).then(setProducts);
  }, [activeCategory, search, departmentId]);

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

  function dismissKeyboard() {
    searchRef.current?.blur();
    document.activeElement?.blur?.();
  }

  async function submit() {
    if (!cart.length || !departmentId) return;
    setSubmitting(true);
    try {
      const order = await api.createOrder({
        department_id: Number(departmentId),
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
      onSubmitted?.(order);
    } catch (e) {
      alert("Не удалось отправить заявку: " + e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {!fixedDepartmentId && (
        <select
          value={departmentId}
          onChange={(e) => { setDepartmentId(e.target.value); setCart([]); }}
          className="input"
          style={{ marginBottom: 12 }}
        >
          <option value="">Для какого цеха заявка?</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      )}

      {departmentId ? (
        <>
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
        </>
      ) : (
        !fixedDepartmentId && (
          <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Выбери цех, чтобы начать собирать заявку.</p>
        )
      )}
    </div>
  );
}
