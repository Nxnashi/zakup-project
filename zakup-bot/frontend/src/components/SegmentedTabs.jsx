import React, { useEffect, useRef, useState } from "react";

export default function SegmentedTabs({ tabs, active, onChange }) {
  const refs = useRef({});
  const [style, setStyle] = useState({ transform: "translateX(0px)", width: 0 });

  useEffect(() => {
    const el = refs.current[active];
    if (el) {
      setStyle({ transform: `translateX(${el.offsetLeft - 4}px)`, width: `${el.offsetWidth}px` });
    }
  }, [active, tabs.length]);

  return (
    <div className="tabs" role="tablist">
      <div className="tab-indicator" style={style} />
      {tabs.map((t) => (
        <button
          key={t.value}
          ref={(el) => (refs.current[t.value] = el)}
          className={`tab ${active === t.value ? "active" : ""}`}
          role="tab"
          aria-selected={active === t.value}
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
