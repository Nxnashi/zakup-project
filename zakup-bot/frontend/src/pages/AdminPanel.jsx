import React, { useEffect, useState } from "react";
import { api } from "../api/client";

const roleLabels = { cook: "Повар", chef: "Шеф / су-шеф", purchaser: "Закупщик", admin: "Админ" };

export default function AdminPanel() {
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
    Promise.all([api.users(), api.departments()]).then(([u, d]) => {
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
      await api.deleteUser(id);
      load();
    } catch (e) {
      alert("Ошибка: " + e.message);
    }
  }

  if (loading) return <p style={{ color: "var(--text-secondary)" }}>Загрузка…</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Пользователей: {users.length}</p>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          style={{ padding: "8px 14px", background: "var(--accent)", color: "#fff", border: "none", fontSize: 13 }}
        >
          {showAddForm ? "Отмена" : "+ Добавить"}
        </button>
      </div>

      {showAddForm && (
        <div style={{ border: "1px solid var(--border)", background: "var(--surface)", padding: 12, marginBottom: 14 }}>
          <input
            placeholder="Имя Фамилия"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            style={{ width: "100%", padding: 8, border: "1px solid var(--border)", marginBottom: 8 }}
          />
          <input
            placeholder="username (без @)"
            value={form.telegram_username}
            onChange={(e) => setForm({ ...form, telegram_username: e.target.value })}
            style={{ width: "100%", padding: 8, border: "1px solid var(--border)", marginBottom: 8 }}
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            style={{ width: "100%", padding: 8, border: "1px solid var(--border)", marginBottom: 8 }}
          >
            {Object.entries(roleLabels).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          {form.role === "cook" && (
            <select
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              style={{ width: "100%", padding: 8, border: "1px solid var(--border)", marginBottom: 8 }}
            >
              <option value="">Выбери цех</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={submitNew}
            style={{ width: "100%", padding: 10, background: "var(--accent)", color: "#fff", border: "none" }}
          >
            Сохранить
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
          />
        ))}
      </div>
    </div>
  );
}

function UserRow({ user, departments, editing, onEdit, onCancel, onSave, onDelete }) {
  const [role, setRole] = useState(user.role);
  const [departmentId, setDepartmentId] = useState(user.department ? String(user.department.id) : "");

  if (!editing) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border)", background: "var(--surface)", padding: "8px 12px" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{user.full_name}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            @{user.telegram_username} · {roleLabels[user.role]}
            {user.department ? ` · ${user.department.name}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onEdit} style={{ fontSize: 12, padding: "6px 10px", border: "1px solid var(--border)", background: "var(--surface)" }}>
            Изменить
          </button>
          <button onClick={onDelete} style={{ fontSize: 12, padding: "6px 10px", border: "1px solid var(--border)", background: "var(--danger-bg)", color: "var(--danger)" }}>
            Убрать
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid var(--accent)", background: "var(--surface)", padding: 12 }}>
      <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>{user.full_name}</p>
      <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: "100%", padding: 8, border: "1px solid var(--border)", marginBottom: 8 }}>
        {Object.entries(roleLabels).map(([val, label]) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </select>
      {role === "cook" && (
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} style={{ width: "100%", padding: 8, border: "1px solid var(--border)", marginBottom: 8 }}>
          <option value="">Выбери цех</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: 8, border: "1px solid var(--border)", background: "var(--surface)" }}>
          Отмена
        </button>
        <button
          onClick={() => onSave({ role, department_id: role === "cook" && departmentId ? Number(departmentId) : null })}
          style={{ flex: 1, padding: 8, background: "var(--accent)", color: "#fff", border: "none" }}
        >
          Сохранить
        </button>
      </div>
    </div>
  );
}
