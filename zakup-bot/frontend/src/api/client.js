const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8010";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  departments: () => request("/departments"),
  users: (role) => request(`/users${role ? `?role=${role}` : ""}`),
  categories: () => request("/categories"),
  products: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/products${qs ? `?${qs}` : ""}`);
  },
  createProduct: (payload) =>
    request("/products", { method: "POST", body: JSON.stringify(payload) }),
  updateProduct: (id, payload) =>
    request(`/products/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),

  orders: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/orders${qs ? `?${qs}` : ""}`);
  },
  createOrder: (payload) =>
    request("/orders", { method: "POST", body: JSON.stringify(payload) }),
  editOrder: (id, payload) =>
    request(`/orders/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  approveOrder: (id, payload) =>
    request(`/orders/${id}/approve`, { method: "POST", body: JSON.stringify(payload) }),
  rejectOrder: (id, payload) =>
    request(`/orders/${id}/reject`, { method: "POST", body: JSON.stringify(payload) }),

  createUser: (payload) =>
    request("/users", { method: "POST", body: JSON.stringify(payload) }),
  updateUser: (id, payload) =>
    request(`/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteUser: (id) => request(`/users/${id}`, { method: "DELETE" }),

  consolidated: () => request("/purchasing/consolidated"),
  exportExcelUrl: () => `${API_BASE}/purchasing/export-excel`,
  byDepartment: () => request("/purchasing/by-department"),
  markAcquired: (itemIds) =>
    request("/purchasing/mark-acquired", { method: "POST", body: JSON.stringify({ item_ids: itemIds }) }),

  settings: () => request("/settings"),
  updateSettings: (payload) =>
    request("/settings", { method: "PATCH", body: JSON.stringify(payload) }),

  authTelegram: (initData) =>
    request("/auth/telegram", { method: "POST", body: JSON.stringify({ init_data: initData }) }),
};
