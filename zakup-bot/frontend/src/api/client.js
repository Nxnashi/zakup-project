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
  orders: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/orders${qs ? `?${qs}` : ""}`);
  },
  createOrder: (payload) =>
    request("/orders", { method: "POST", body: JSON.stringify(payload) }),
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
  byDepartment: () => request("/purchasing/by-department"),
  markStatus: (productId, status) =>
    request("/purchasing/mark-status", {
      method: "POST",
      body: JSON.stringify({ product_id: productId, status }),
    }),
};
