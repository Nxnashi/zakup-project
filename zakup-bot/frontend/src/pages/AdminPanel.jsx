import React, { useEffect, useState } from "react";
import { api } from "../api/client";
import SegmentedTabs from "../components/SegmentedTabs.jsx";

const roleLabels = { cook: "Повар", chef: "Шеф / су-шеф", purchaser: "Закупщик", admin: "Админ" };

export default function AdminPanel() {
  const [section, setSection] = useState("users");

  return (
    <div className="fade-in">
      <SegmentedTabs
        tabs={[
          { value: "users", label: "Сотрудники" },
          { value: "products", label: "ТМЦ" },
          { value: "settings", label: "Настройки" },
        ]}
        active={section}
        onChange={setSection}
      />
      <div style={{ marginTop: 16 }}>
        {section === "users" && <UsersSection />}
        {section === "products" && <ProductsSection />}
        {section === "settings" && <SettingsSection />}
      </div>
    </div>
  );
}

// ============================= Сотрудники =============================

function UsersSection() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm());

  function emptyForm() {
    return { full_name: "", telegram_username: "", role: "cook", department_id: "" };
  }

  function load() {
    setLoading(true);
    Promise.all([api.users({ include_inactive: true }), api.departments()]).then(([u, d]) => {
      setUsers(u);
      setDepartments(d);
      setLoading(false);
    });
  }

  useEffect(load, []);

  async function submitNew() {
    if (!form.full_name.trim() || !form.telegram_username.trim()) {
      alert("Укажи имя и username");
      return;
    }
    try {
      await api.createUser({
        full_name: form.full_name.trim(),
        telegram_username: form.telegram_username.trim(),
        role: form.role,
        department_id: form.department_id ? Number(form.department_id) : null,
      });
      setForm(emptyForm());
      setShowAddForm(false);
      load();
    } catch (e) {
      alert("Ошибка: " + e.message);
    }
  }

  async function saveEdit(id, patch) {
    try {
      await api.updateUser(id, patch);
      setEditingId(null);
      load();
    } catch (e) {
      alert("Ошибка: " + e.message);
    }
  }

  async function remove(id, name) {
    if (!window.confirm(`Убрать доступ у «${name}»?`)) return;
    try {
      const res = await api.deleteUser(id);
      if (res?.deactivated) {
        alert(`«${name}» уже фигурирует в истории заявок, поэтому удалить нельзя без потери данных — доступ просто отключён. Историю заявок это не тронуло.`);
      }
      load();
    } catch (e) {
      alert("Ошибка: " + e.message);
    }
  }

  async function reactivate(id) {
    try {
      await api.updateUser(id, { is_active: true });
      load();
    } catch (e) {
      alert("Ошибка: " + e.message);
    }
  }

  if (loading) return <SkeletonList />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          Сотрудников: <strong style={{ color: "var(--ink)" }}>{users.length}</strong>
        </p>
        <button onClick={() => setShowAddForm((v) => !v)} className={showAddForm ? "btn" : "btn btn-primary"} style={{ fontSize: 13, padding: "9px 14px" }}>
          {showAddForm ? "Отмена" : "+ Добавить"}
        </button>
      </div>

      {showAddForm && (
        <div className="card scale-in" style={{ padding: 14, marginBottom: 14 }}>
          <input
            placeholder="Имя Фамилия"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="input"
            style={{ marginBottom: 8 }}
          />
          <input
            placeholder="username (без @)"
            value={form.telegram_username}
            onChange={(e) => setForm({ ...form, telegram_username: e.target.value })}
            className="input"
            style={{ marginBottom: 8 }}
          />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input" style={{ marginBottom: 8 }}>
            {Object.entries(roleLabels).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          {form.role === "cook" && (
            <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className="input" style={{ marginBottom: 8 }}>
              <option value="">Выбери цех</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
          <button onClick={submitNew} className="btn btn-primary" style={{ width: "100%", padding: 12 }}>
            Сохранить
          </button>
        </div>
      )}

      <div className="stagger-list" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {users.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            departments={departments}
            editing={editingId === u.id}
            onEdit={() => setEditingId(u.id)}
            onCancel={() => setEditingId(null)}
            onSave={(patch) => saveEdit(u.id, patch)}
            onDelete={() => remove(u.id, u.full_name)}
            onReactivate={() => reactivate(u.id)}
          />
        ))}
      </div>
    </div>
  );
}

function UserRow({ user, departments, editing, onEdit, onCancel, onSave, onDelete, onReactivate }) {
  const [role, setRole] = useState(user.role);
  const [departmentId, setDepartmentId] = useState(user.department ? String(user.department.id) : "");

  if (!editing) {
    return (
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 13px", opacity: user.is_active ? 1 : 0.6 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            {user.full_name}
            {!user.is_active && <span className="badge badge-neutral" style={{ fontSize: 10.5 }}>отключён</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            @{user.telegram_username} · {roleLabels[user.role]}
            {user.department ? ` · ${user.department.name}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {user.is_active ? (
            <>
              <button onClick={onEdit} className="btn" style={{ fontSize: 12, padding: "7px 11px" }}>Изменить</button>
              <button onClick={onDelete} className="btn btn-danger" style={{ fontSize: 12, padding: "7px 11px" }}>Убрать</button>
            </>
          ) : (
            <button onClick={onReactivate} className="btn btn-primary" style={{ fontSize: 12, padding: "7px 11px" }}>Восстановить</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card scale-in" style={{ padding: 14, borderColor: "var(--accent)" }}>
      <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{user.full_name}</p>
      <select value={role} onChange={(e) => setRole(e.target.value)} className="input" style={{ marginBottom: 8 }}>
        {Object.entries(roleLabels).map(([val, label]) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </select>
      {role === "cook" && (
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="input" style={{ marginBottom: 8 }}>
          <option value="">Выбери цех</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} className="btn" style={{ flex: 1, padding: 9 }}>Отмена</button>
        <button
          onClick={() => onSave({ role, department_id: role === "cook" && departmentId ? Number(departmentId) : null })}
          className="btn btn-primary"
          style={{ flex: 1, padding: 9 }}
        >
          Сохранить
        </button>
      </div>
    </div>
  );
}

// ============================= ТМЦ =============================

function ProductsSection() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm());

  function emptyForm() {
    return { name: "", unit: "кг", default_supplier: "", category_id: "", category_name: "", department_ids: [] };
  }

  function load() {
    setLoading(true);
    Promise.all([api.products(), api.categories(), api.departments()]).then(([p, c, d]) => {
      setProducts(p);
      setCategories(c);
      setDepartments(d);
      setLoading(false);
    });
  }

  useEffect(load, []);

  const filtered = search
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  async function submitNew() {
    if (!form.name.trim()) {
      alert("Укажи название");
      return;
    }
    if (!form.category_id && !form.category_name.trim()) {
      alert("Выбери категорию или введи новую");
      return;
    }
    try {
      await api.createProduct({
        name: form.name.trim(),
        unit: form.unit || null,
        default_supplier: form.default_supplier || null,
        category_id: form.category_id ? Number(form.category_id) : null,
        category_name: form.category_id ? null : form.category_name.trim(),
        department_ids: form.department_ids,
      });
      setForm(emptyForm());
      setShowAddForm(false);
      load();
    } catch (e) {
      alert("Ошибка: " + e.message);
    }
  }

  async function saveEdit(id, patch) {
    try {
      await api.updateProduct(id, patch);
      setEditingId(null);
      load();
    } catch (e) {
      alert("Ошибка: " + e.message);
    }
  }

  async function remove(id, name) {
    if (!window.confirm(`Удалить «${name}» из номенклатуры?`)) return;
    try {
      await api.deleteProduct(id);
      load();
    } catch (e) {
      alert("Ошибка: " + e.message);
    }
  }

  function toggleDept(id) {
    setForm((f) => ({
      ...f,
      department_ids: f.department_ids.includes(id) ? f.department_ids.filter((x) => x !== id) : [...f.department_ids, id],
    }));
  }

  if (loading) return <SkeletonList />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
        <input
          placeholder="Поиск по номенклатуре…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
          style={{ flex: 1 }}
        />
        <button onClick={() => setShowAddForm((v) => !v)} className={showAddForm ? "btn" : "btn btn-primary"} style={{ fontSize: 13, padding: "10px 14px", flexShrink: 0 }}>
          {showAddForm ? "Отмена" : "+ ТМЦ"}
        </button>
      </div>
      <p style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 12 }}>Всего позиций: {products.length}</p>

      {showAddForm && (
        <div className="card scale-in" style={{ padding: 14, marginBottom: 14 }}>
          <input
            placeholder="Название (например «Лимон»)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
            style={{ marginBottom: 8 }}
          />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              placeholder="Ед.изм (кг/л/шт)"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="input"
              style={{ flex: 1 }}
            />
            <input
              placeholder="Поставщик"
              value={form.default_supplier}
              onChange={(e) => setForm({ ...form, default_supplier: e.target.value })}
              className="input"
              style={{ flex: 1 }}
            />
          </div>
          <select
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value, category_name: "" })}
            className="input"
            style={{ marginBottom: 8 }}
          >
            <option value="">— новая категория ниже —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {!form.category_id && (
            <input
              placeholder="Название новой категории"
              value={form.category_name}
              onChange={(e) => setForm({ ...form, category_name: e.target.value })}
              className="input"
              style={{ marginBottom: 8 }}
            />
          )}
          <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "4px 0 6px" }}>Кому видна позиция:</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {departments.map((d) => (
              <button
                key={d.id}
                onClick={() => toggleDept(d.id)}
                className={`chip ${form.department_ids.includes(d.id) ? "active" : ""}`}
                type="button"
              >
                {d.name}
              </button>
            ))}
          </div>
          <button onClick={submitNew} className="btn btn-primary" style={{ width: "100%", padding: 12 }}>
            Сохранить
          </button>
        </div>
      )}

      <div className="stagger-list" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.map((p) => (
          <ProductRow
            key={p.id}
            product={p}
            categories={categories}
            departments={departments}
            editing={editingId === p.id}
            onEdit={() => setEditingId(p.id)}
            onCancel={() => setEditingId(null)}
            onSave={(patch) => saveEdit(p.id, patch)}
            onDelete={() => remove(p.id, p.name)}
          />
        ))}
        {filtered.length === 0 && <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>Ничего не найдено.</p>}
      </div>
    </div>
  );
}

function ProductRow({ product, categories, departments, editing, onEdit, onCancel, onSave, onDelete }) {
  const [name, setName] = useState(product.name);
  const [unit, setUnit] = useState(product.unit || "");
  const [supplier, setSupplier] = useState(product.default_supplier || "");
  const [categoryId, setCategoryId] = useState(String(product.category.id));
  const [deptIds, setDeptIds] = useState(product.departments.map((d) => d.id));

  function toggleDept(id) {
    setDeptIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  if (!editing) {
    return (
      <div className="card" style={{ padding: "10px 13px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{product.name}</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
              {product.category.name} · {product.unit || "—"}
              {product.default_supplier ? ` · ${product.default_supplier}` : ""}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 3 }}>
              {product.departments.length ? product.departments.map((d) => d.name).join(", ") : "не привязано ни к одному цеху"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={onEdit} className="btn" style={{ fontSize: 12, padding: "6px 10px" }}>Изм.</button>
            <button onClick={onDelete} className="btn btn-danger" style={{ fontSize: 12, padding: "6px 10px" }}>✕</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card scale-in" style={{ padding: 14, borderColor: "var(--accent)" }}>
      <input value={name} onChange={(e) => setName(e.target.value)} className="input" style={{ marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Ед.изм" className="input" style={{ flex: 1 }} />
        <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Поставщик" className="input" style={{ flex: 1 }} />
      </div>
      <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input" style={{ marginBottom: 8 }}>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 6px" }}>Кому видна:</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {departments.map((d) => (
          <button key={d.id} onClick={() => toggleDept(d.id)} className={`chip ${deptIds.includes(d.id) ? "active" : ""}`} type="button">
            {d.name}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} className="btn" style={{ flex: 1, padding: 9 }}>Отмена</button>
        <button
          onClick={() => onSave({ name, unit, default_supplier: supplier, category_id: Number(categoryId), department_ids: deptIds })}
          className="btn btn-primary"
          style={{ flex: 1, padding: 9 }}
        >
          Сохранить
        </button>
      </div>
    </div>
  );
}

// ============================= Настройки =============================

function SettingsSection() {
  const [cutoff, setCutoff] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings().then((s) => {
      setCutoff(s.order_edit_cutoff || "");
      setLoading(false);
    });
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api.updateSettings({ order_edit_cutoff: cutoff || null });
    } catch (e) {
      alert("Ошибка: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <SkeletonList />;

  return (
    <div className="card" style={{ padding: 16 }}>
      <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Дедлайн редактирования заявки</p>
      <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 12, lineHeight: 1.5 }}>
        До этого времени (по Ташкенту) повар может править ещё не рассмотренную заявку.
        После — заявка закрывается для правок, но подать новую можно.
        Оставь поле пустым, чтобы убрать дедлайн совсем.
      </p>
      <input
        type="time"
        value={cutoff}
        onChange={(e) => setCutoff(e.target.value)}
        className="input"
        style={{ marginBottom: 12, maxWidth: 160 }}
      />
      <button onClick={save} disabled={saving} className="btn btn-primary" style={{ padding: "10px 18px" }}>
        {saving ? "Сохранение…" : "Сохранить"}
      </button>
    </div>
  );
}

function SkeletonList() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="skeleton" style={{ height: 44, marginBottom: 6 }} />
      <div className="skeleton" style={{ height: 54 }} />
      <div className="skeleton" style={{ height: 54 }} />
    </div>
  );
}
