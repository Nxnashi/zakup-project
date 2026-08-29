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

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="skeleton" style={{ height: 44, marginBottom: 6 }} />
        <div className="skeleton" style={{ height: 54 }} />
        <div className="skeleton" style={{ height: 54 }} />
        <div className="skeleton" style={{ height: 54 }} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          Пользователей: <strong style={{ color: "var(--ink)" }}>{users.length}</strong>
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
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 13px" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{user.full_name}</div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            @{user.telegram_username} · {roleLabels[user.role]}
            {user.department ? ` · ${user.department.name}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onEdit} className="btn" style={{ fontSize: 12, padding: "7px 11px" }}>
            Изменить
          </button>
          <button onClick={onDelete} className="btn btn-danger" style={{ fontSize: 12, padding: "7px 11px" }}>
            Убрать
          </button>
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
        <button onClick={onCancel} className="btn" style={{ flex: 1, padding: 9 }}>
          Отмена
        </button>
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
