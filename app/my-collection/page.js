"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import TopBar from "../../components/TopBar";
import BottomNav from "../../components/BottomNav";

export default function MyCollectionPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      const { data: p } = await supabase.from("profiles").select("*").eq("id", data.session.user.id).single();
      setProfile(p);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar profile={profile} title="Mi colección" />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <p style={{ color: "#7D8A96", fontSize: 13, textAlign: "center", lineHeight: 1.6 }}>
          Esta pantalla (progreso por colección) la montamos en la siguiente etapa.
          <br />
          Por ahora puedes marcar tus cartas desde "Colecciones".
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
