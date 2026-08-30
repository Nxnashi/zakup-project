import React, { useEffect, useState } from "react";
import { api } from "./api/client";
import CookForm from "./pages/CookForm.jsx";
import ChefApproval from "./pages/ChefApproval.jsx";
import PurchaserDashboard from "./pages/PurchaserDashboard.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import BrandMark from "./components/BrandMark.jsx";

const STORAGE_KEY = "zakup_bot_dev_user_id";

const roleLabels = { cook: "Повар", chef: "Шеф / су-шеф", purchaser: "Закупщик", admin: "Админ" };
const roleOrder = { cook: 0, chef: 1, purchaser: 2, admin: 3 };

export default function App() {
  const [phase, setPhase] = useState("loading"); // loading | telegram | denied | dev-pick | ready
  const [currentUser, setCurrentUser] = useState(null);
  const [devUsers, setDevUsers] = useState([]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const initData = tg?.initData;

    if (tg) {
      tg.ready();
      tg.expand();
    }

    if (initData) {
      // Внутри настоящего Telegram — входим по подписанным данным, без выбора вручную.
      api.authTelegram(initData)
        .then((user) => {
          setCurrentUser(user);
          setPhase("ready");
        })
        .catch(() => setPhase("denied"));
      return;
    }

    // Открыто не из Telegram (например, разработка в обычном браузере) —
    // временный выбор пользователя, чтобы можно было тестировать все роли.
    const savedId = localStorage.getItem(STORAGE_KEY);
    api.users().then((data) => {
      setDevUsers(data);
      if (savedId) {
        const found = data.find((u) => String(u.id) === String(savedId));
        if (found) {
          setCurrentUser(found);
          setPhase("ready");
          return;
        }
      }
      setPhase("dev-pick");
    });
  }, []);

  function pickDevUser(user) {
    localStorage.setItem(STORAGE_KEY, user.id);
    setCurrentUser(user);
    setPhase("ready");
  }

  function switchDevUser() {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
    setPhase("dev-pick");
  }

  if (phase === "loading") {
    return (
      <div style={{ padding: 20 }}>
        <div className="skeleton" style={{ height: 22, width: "50%", marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 64, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 64 }} />
      </div>
    );
  }

  if (phase === "denied") {
    return (
      <div className="fade-in" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 80 }}>
        <BrandMark size={40} />
        <h2 className="display" style={{ fontSize: 19, fontWeight: 800, margin: "18px 0 8px" }}>Доступ не предоставлен</h2>
        <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.5, maxWidth: 280 }}>
          Обратитесь к администратору, чтобы вас добавили в систему.
        </p>
      </div>
    );
  }

  if (phase === "dev-pick") {
    const grouped = [...devUsers].sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
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
            Открыто не из Telegram — режим разработки. В Telegram вход происходит автоматически.
          </p>
        </div>
        <div className="stagger-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {grouped.map((u) => (
            <button
              key={u.id}
              onClick={() => pickDevUser(u)}
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

  const isDev = !window.Telegram?.WebApp?.initData;

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
        {isDev && (
          <button onClick={switchDevUser} className="btn btn-ghost" style={{ fontSize: 12, padding: "7px 11px" }}>
            Сменить
          </button>
        )}
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
