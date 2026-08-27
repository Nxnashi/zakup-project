import React, { useEffect, useState } from "react";
import { api } from "./api/client";
import CookForm from "./pages/CookForm.jsx";
import ChefApproval from "./pages/ChefApproval.jsx";
import PurchaserDashboard from "./pages/PurchaserDashboard.jsx";

// NOTE: в проде пользователь определяется по Telegram initData (WebApp.initDataUnsafe.user.id),
// сверенному на бэкенде с полем telegram_id. Здесь для разработки — простой выбор пользователя.
const STORAGE_KEY = "zakup_bot_user_id";

export default function App() {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.users().then((data) => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  const currentUser = users.find((u) => String(u.id) === String(userId));

  function pickUser(id) {
    localStorage.setItem(STORAGE_KEY, id);
    setUserId(id);
  }

  function switchUser() {
    localStorage.removeItem(STORAGE_KEY);
    setUserId("");
  }

  if (loading) {
    return <div style={{ padding: 20, color: "var(--text-secondary)" }}>Загрузка…</div>;
  }

  if (!currentUser) {
    return (
      <div style={{ padding: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500 }}>Кто вы?</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Временный экран для разработки. В проде — вход через Telegram.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => pickUser(u.id)}
              style={{
                textAlign: "left",
                padding: "10px 14px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <div style={{ fontWeight: 500 }}>{u.full_name}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {roleLabel(u.role)}
                {u.department ? ` · ${u.department.name}` : ""}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div>
          <div style={{ fontWeight: 500, fontSize: 15 }}>{currentUser.full_name}</div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {roleLabel(currentUser.role)}
            {currentUser.department ? ` · ${currentUser.department.name}` : ""}
          </div>
        </div>
        <button
          onClick={switchUser}
          style={{ fontSize: 12, padding: "6px 10px", border: "1px solid var(--border)", background: "var(--surface)" }}
        >
          Сменить
        </button>
      </header>

      <main style={{ padding: 16 }}>
        {currentUser.role === "cook" && <CookForm user={currentUser} />}
        {currentUser.role === "chef" && <ChefApproval user={currentUser} />}
        {currentUser.role === "purchaser" && <PurchaserDashboard user={currentUser} />}
      </main>
    </div>
  );
}

function roleLabel(role) {
  return { cook: "Повар", chef: "Шеф / су-шеф", purchaser: "Закупщик" }[role] || role;
}
