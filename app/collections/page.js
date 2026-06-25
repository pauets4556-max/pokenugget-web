"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import TopBar from "../../components/TopBar";
import BottomNav from "../../components/BottomNav";

const LANGS = [
  { code: "es", flag: "🇪🇸" },
  { code: "en", flag: "🇬🇧" },
  { code: "ja", flag: "🇯🇵" },
  { code: "ko", flag: "🇰🇷" },
  { code: "zh", flag: "🇨🇳" },
];

export default function CollectionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [lang, setLang] = useState("es");
  const [collections, setCollections] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        router.replace("/login");
        return;
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sessionData.session.user.id)
        .single();

      const { data: cols } = await supabase.from("collections").select("*").order("created_at");
      const { data: collItems } = await supabase
        .from("collection_items")
        .select("collection_id, set_id, sets(id, lang, name)");

      if (active) {
        setProfile(profileData);
        setCollections(cols || []);
        setItems(collItems || []);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <span style={{ color: "#7D8A96", fontSize: 14 }}>Cargando...</span>
      </div>
    );
  }

  const visibleCollections = collections
    .map((c) => {
      const itsItems = items.filter((i) => i.collection_id === c.id && i.sets?.lang === lang);
      return { ...c, setCount: itsItems.length };
    })
    .filter((c) => c.setCount > 0);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar profile={profile} title="Colecciones" />

      <div style={{ display: "flex", gap: 4, padding: "10px 16px 0" }}>
        {LANGS.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            style={{
              background: "transparent",
              border: lang === l.code ? "1px solid #4A8FB8" : "1px solid transparent",
              borderRadius: 6,
              width: 30,
              height: 30,
              fontSize: 15,
              cursor: "pointer",
              opacity: lang === l.code ? 1 : 0.5,
            }}
          >
            {l.flag}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {visibleCollections.length === 0 ? (
          <div style={{ textAlign: "center", color: "#7D8A96", fontSize: 13, marginTop: 30 }}>
            No hay colecciones con sets en este idioma todavía.
          </div>
        ) : (
          visibleCollections.map((c) => (
            <Link
              key={c.id}
              href={`/collections/${c.id}?lang=${lang}`}
              style={{
                display: "block",
                background: "#141922",
                border: "1px solid #2B3440",
                borderRadius: 14,
                padding: "14px 16px",
                textDecoration: "none",
              }}
            >
              <div style={{ fontWeight: 800, color: "#DCE3E8", fontSize: 14.5 }}>{c.name}</div>
              {c.description && (
                <div style={{ fontSize: 12, color: "#7D8A96", marginTop: 4 }}>{c.description}</div>
              )}
              <div style={{ fontSize: 11, color: "#4A8FB8", marginTop: 6, fontWeight: 700 }}>
                {c.setCount} set{c.setCount !== 1 ? "s" : ""}
              </div>
            </Link>
          ))
        )}
      </div>

      <BottomNav isAdmin={profile?.role === "admin"} />
    </div>
  );
}
