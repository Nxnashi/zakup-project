import React, { useState } from "react";
import SegmentedTabs from "../components/SegmentedTabs.jsx";
import OrderComposer from "../components/OrderComposer.jsx";
import OrderHistoryList from "../components/OrderHistoryList.jsx";

export default function CookForm({ user }) {
  const [tab, setTab] = useState("new");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <SegmentedTabs
        tabs={[
          { value: "new", label: "Новая заявка" },
          { value: "history", label: "Мои заявки" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div style={{ marginTop: 16 }}>
        {tab === "new" && (
          <div key="new" className="fade-in">
            <OrderComposer
              user={user}
              fixedDepartmentId={user.department?.id}
              onSubmitted={() => {
                setRefreshKey((k) => k + 1);
                setTab("history");
              }}
            />
          </div>
        )}

        {tab === "history" && (
          <div key="history" className="fade-in">
            <OrderHistoryList user={user} refreshKey={refreshKey} />
          </div>
        )}
      </div>
    </div>
  );
}
