"use client";

import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import NotificationBell from "./NotificationBell";

const COLS = "44px 1fr 44px";

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
        flexDirection: "column",
        borderBottom: "1px solid #2B3440",
        background: "#10141B",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: COLS, alignItems: "center", padding: "10px 16px 6px" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          {profile?.id && <NotificationBell userId={profile.id} />}
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <img src="/logo.png" alt="Poké Nugget TCG" style={{ height: 48, objectFit: "contain" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          {profile && (
            <button
              onClick={handleLogout}
              style={{ background: "none", border: "1px solid #2B3440", color: "#7D8A96", borderRadius: 6, padding: "4px 6px", fontSize: 10, cursor: "pointer" }}
            >
              Salir
            </button>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: COLS, alignItems: "center", padding: "8px 16px 10px" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{ background: "none", border: "none", color: "#4A8FB8", cursor: "pointer", fontSize: 16, padding: 0 }}
              aria-label="Volver"
            >
              ←
            </button>
          )}
        </div>
        <span style={{ fontWeight: 800, color: "#4A8FB8", fontSize: 14, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>
          {title}
        </span>
        <div style={{ display: "flex", justifyContent: "center" }}>
          {profile && (
            <span style={{ fontSize: 10, color: "#7D8A96", fontFamily: "monospace" }}>{profile.code}</span>
          )}
        </div>
      </div>
    </div>
  );
}
