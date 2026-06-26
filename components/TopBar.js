"use client";

import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import NotificationBell from "./NotificationBell";

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
      <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 60px", alignItems: "center", padding: "10px 16px 6px" }}>
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          {profile?.id && <NotificationBell userId={profile.id} />}
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <img src="/logo.png" alt="Poké Nugget TCG" style={{ height: 48, objectFit: "contain" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {profile && (
            <button
              onClick={handleLogout}
              style={{ background: "none", border: "1px solid #2B3440", color: "#7D8A96", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}
            >
              Salir
            </button>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 60px", alignItems: "center", gap: 4, padding: "8px 16px 10px" }}>
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
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
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {profile && (
            <span style={{ fontSize: 11, color: "#7D8A96", fontFamily: "monospace" }}>{profile.code}</span>
          )}
        </div>
      </div>
    </div>
  );
}
