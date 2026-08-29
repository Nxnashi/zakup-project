import React, { useEffect, useState } from "react";
import { api } from "./api/client";
import CookForm from "./pages/CookForm.jsx";
import ChefApproval from "./pages/ChefApproval.jsx";
import PurchaserDashboard from "./pages/PurchaserDashboard.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import BrandMark from "./components/BrandMark.jsx";

// NOTE: в проде пользователь определяется по Telegram initData (WebApp.initDataUnsafe.user.id),
// сверенному на бэкенде с полем telegram_id. Здесь для разработки — простой выбор пользователя.
const STORAGE_KEY = "zakup_bot_user_id";

const roleLabels = { cook: "Повар", chef: "Шеф / су-шеф", purchaser: "Закупщик", admin: "Админ" };
const roleOrder = { cook: 0, chef: 1, purchaser: 2, admin: 3 };

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
    return (
      <div style={{ padding: 20 }}>
        <div className="skeleton" style={{ height: 22, width: "50%", marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 64, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 64, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 64 }} />
      </div>
    );
  }

  if (!currentUser) {
    const grouped = [...users].sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
    return (
      <div className="fade-in" style={{ padding: 20 }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <BrandMark size={22} />
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent-bright)", margin: 0, textTransform: "uppercase" }}>
              ZAKUP · PB
            </p>
          </div>
          <h2 className="display" style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Кто вы?</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            Временный экран для разработки. В проде — вход через Telegram.
          </p>
        </div>
        <div className="stagger-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {grouped.map((u) => (
            <button
              key={u.id}
              onClick={() => pickUser(u.id)}
              className="card card-interactive"
              style={{ textAlign: "left", padding: "13px 15px", border: "1px solid var(--border)" }}
            >
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{u.full_name}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 2 }}>
                {roleLabels[u.role]}
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
          padding: "14px 18px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(12, 25, 24, 0.82)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BrandMark size={24} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{currentUser.full_name}</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
              {roleLabels[currentUser.role]}
              {currentUser.department ? ` · ${currentUser.department.name}` : ""}
            </div>
          </div>
        </div>
        <button onClick={switchUser} className="btn btn-ghost" style={{ fontSize: 12, padding: "7px 11px" }}>
          Сменить
        </button>
      </header>

      <main key={currentUser.id} className="screen-enter" style={{ padding: 16 }}>
        {currentUser.role === "cook" && <CookForm user={currentUser} />}
        {currentUser.role === "chef" && <ChefApproval user={currentUser} />}
        {currentUser.role === "purchaser" && <PurchaserDashboard user={currentUser} />}
        {currentUser.role === "admin" && <AdminPanel />}
      </main>
    </div>
  );
}
