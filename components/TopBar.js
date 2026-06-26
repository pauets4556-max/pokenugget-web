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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 16px 6px", position: "relative" }}>
        <img src="/logo.png" alt="Poké Nugget TCG" style={{ height: 48, objectFit: "contain" }} />
        <div style={{ position: "absolute", left: 12, top: 10 }}>
          {profile?.id && <NotificationBell userId={profile.id} />}
        </div>
        {profile && (
          <div style={{ position: "absolute", right: 12, top: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={handleLogout}
              style={{ background: "none", border: "1px solid #2B3440", color: "#7D8A96", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}
            >
              Salir
            </button>
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px 10px" }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{ background: "none", border: "none", color: "#4A8FB8", cursor: "pointer", fontSize: 16 }}
            aria-label="Volver"
          >
            ←
          </button>
        )}
        <span style={{ fontWeight: 800, color: "#4A8FB8", fontSize: 14, textTransform: "uppercase", letterSpacing: "0.06em", flex: 1, textAlign: "center" }}>
          {title}
        </span>
        {profile && (
          <span style={{ fontSize: 11, color: "#7D8A96", fontFamily: "monospace" }}>{profile.code}</span>
        )}
      </div>
    </div>
  );
}
