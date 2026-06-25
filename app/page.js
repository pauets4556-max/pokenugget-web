"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        router.replace("/login");
        return;
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (active) {
        setProfile(profileData);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <span style={{ color: "#7D8A96", fontSize: 14 }}>Cargando...</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
      <h1 style={{ color: "#4A8FB8", fontSize: 22 }}>¡Bienvenido, {profile?.username}!</h1>
      <p style={{ color: "#7D8A96", fontSize: 13, lineHeight: 1.6 }}>
        Tu cuenta está conectada de verdad a la base de datos. Tu código de amigo es{" "}
        <b style={{ color: "#DCE3E8", fontFamily: "monospace" }}>{profile?.code}</b>.
      </p>
      <p style={{ color: "#7D8A96", fontSize: 12.5, lineHeight: 1.6 }}>
        Las pantallas de Sets, Colecciones, Mi colección y Trade se irán añadiendo
        aquí mismo en las próximas etapas.
      </p>
      <button
        onClick={handleLogout}
        style={{
          marginTop: 20,
          background: "transparent",
          border: "1px solid #2B3440",
          color: "#7D8A96",
          borderRadius: 8,
          padding: "9px 18px",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}
