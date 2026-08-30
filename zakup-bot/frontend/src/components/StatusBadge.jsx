import React from "react";

export default function StatusBadge({ status }) {
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
