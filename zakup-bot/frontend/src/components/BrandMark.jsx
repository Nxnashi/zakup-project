import React from "react";
import pbMark from "../assets/pb-mark.png";

export default function BrandMark({ size = 26 }) {
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img
        src={pbMark}
        alt="PB"
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(76,154,124,0.35))" }}
      />
    </div>
  );
}
