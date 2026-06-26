"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import TopBar from "../../components/TopBar";
import BottomNav from "../../components/BottomNav";

const LANGS = [
  { code: "es", flag: "🇪🇸", label: "ES" },
  { code: "en", flag: "🇬🇧", label: "EN" },
  { code: "ja", flag: "🇯🇵", label: "JP" },
  { code: "ko", flag: "🇰🇷", label: "KR" },
  { code: "zh", flag: "🇨🇳", label: "CH" },
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
      const allItems = items.filter((i) => i.collection_id === c.id);
      const itsItems = allItems.filter((i) => i.sets?.lang === lang);
      return { ...c, setCount: itsItems.length, totalSets: allItems.length };
    })
    // Una colección vacía (sin ningún set todavía) se ve en todos los idiomas,
    // para poder encontrarla y añadirle contenido. En cuanto ya tiene sets,
    // solo se muestra en los idiomas donde realmente tiene algo.
    .filter((c) => c.totalSets === 0 || c.setCount > 0);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar profile={profile} title="Colecciones" />

      <div style={{ display: "flex", gap: 4, padding: "10px 16px 0" }}>
        {LANGS.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: lang === l.code ? "#1A2029" : "transparent",
              border: lang === l.code ? "1px solid #4A8FB8" : "1px solid #2B3440",
              borderRadius: 6,
              padding: "5px 8px",
              fontSize: 13,
              cursor: "pointer",
              opacity: lang === l.code ? 1 : 0.6,
              color: lang === l.code ? "#4A8FB8" : "#7D8A96",
              fontWeight: 700,
            }}
          >
            <span>{l.flag}</span>
            <span style={{ fontSize: 10.5 }}>{l.label}</span>
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
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "#141922",
                border: "1px solid #2B3440",
                borderRadius: 14,
                padding: "14px 16px",
                textDecoration: "none",
              }}
            >
              {c.image_url && (
                <img src={c.image_url} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: "#DCE3E8", fontSize: 14.5 }}>{c.name}</div>
              {c.description && (
                <div style={{ fontSize: 12, color: "#7D8A96", marginTop: 4 }}>{c.description}</div>
              )}
              <div style={{ fontSize: 11, color: "#4A8FB8", marginTop: 6, fontWeight: 700 }}>
                {c.setCount} set{c.setCount !== 1 ? "s" : ""}
              </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <BottomNav isAdmin={profile?.role === "admin"} />
    </div>
  );
}
