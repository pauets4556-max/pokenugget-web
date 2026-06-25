"use client";

import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function TopBar({ profile, title, onBack }) {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: "1px solid #2B3440",
        background: "#10141B",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{ background: "none", border: "none", color: "#4A8FB8", cursor: "pointer", fontSize: 16 }}
            aria-label="Volver"
          >
            ←
          </button>
        )}
        <span style={{ fontWeight: 800, color: "#4A8FB8", fontSize: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {title}
        </span>
      </div>
      {profile && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "#7D8A96", fontFamily: "monospace" }}>{profile.code}</span>
          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "1px solid #2B3440",
              color: "#7D8A96",
              borderRadius: 6,
              padding: "4px 8px",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Salir
          </button>
        </div>
      )}
    </div>
  );
}
