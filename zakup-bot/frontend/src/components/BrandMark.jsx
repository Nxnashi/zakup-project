import React from "react";

export default function BrandMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 10 L30 10 L30 28 L8 36 Z" fill="var(--sage)" opacity="0.6" />
      <path d="M17 28 L30 24 L30 38 L17 44 Z" fill="var(--accent-bright)" />
    </svg>
  );
}
