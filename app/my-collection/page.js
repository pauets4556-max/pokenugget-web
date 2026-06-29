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

export default function MyCollectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [lang, setLang] = useState("es");
  const [collections, setCollections] = useState([]);
  const [items, setItems] = useState([]);
  const [cards, setCards] = useState([]);
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        router.replace("/login");
        return;
      }
      const uid = sessionData.session.user.id;

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", uid).single();
      const { data: cols } = await supabase.from("collections").select("*").order("created_at");
      const { data: collItems } = await supabase
        .from("collection_items")
        .select("collection_id, set_id, sets(id, lang, name)");
      const { data: allCards } = await supabase.from("cards").select("id, set_id");
      const { data: userCards } = await supabase.from("user_cards").select("card_id, quantity").eq("user_id", uid);

      const qtyMap = {};
      (userCards || []).forEach((uc) => {
        qtyMap[uc.card_id] = uc.quantity;
      });

      if (active) {
        setProfile(profileData);
        setCollections(cols || []);
        setItems(collItems || []);
        setCards(allCards || []);
        setQuantities(qtyMap);
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

  const computeStats = (setIds) => {
    const setIdSet = new Set(setIds);
    const relevantCards = cards.filter((c) => setIdSet.has(c.set_id));
    let ownedVariety = 0;
    let duplicates = 0;
    relevantCards.forEach((c) => {
      const q = quantities[c.id] || 0;
      if (q > 0) ownedVariety += 1;
      if (q > 1) duplicates += q - 1;
    });
    return { total: relevantCards.length, ownedVariety, duplicates };
  };

  const visibleCollections = collections
    .map((c) => {
      const allItems = items.filter((i) => i.collection_id === c.id);
      const itsSetIds = allItems.filter((i) => i.sets?.lang === lang).map((i) => i.set_id);
      const stats = computeStats(itsSetIds);
      return { ...c, setCount: itsSetIds.length, totalSets: allItems.length, ...stats };
    })
    .filter((c) => c.totalSets === 0 || c.setCount > 0);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar profile={profile} title="Mi colección" />

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
          visibleCollections.map((c) => {
            const pct = c.total ? Math.round((c.ownedVariety / c.total) * 100) : 0;
            return (
              <Link
                key={c.id}
                href={`/my-collection/${c.id}?lang=${lang}`}
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
                <div style={{ fontSize: 11, color: "#7D8A96", marginTop: 2 }}>
                  {c.setCount} set{c.setCount !== 1 ? "s" : ""}
                </div>
                <div style={{ marginTop: 8, height: 5, borderRadius: 4, background: "#2B3440", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "#4A8FB8" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 11.5, color: "#4A8FB8", fontWeight: 700 }}>
                    {c.ownedVariety}/{c.total} ({pct}%)
                  </span>
                  {c.duplicates > 0 && (
                    <span style={{ fontSize: 11, color: "#4F9B72", fontWeight: 700 }}>+{c.duplicates} repetidas</span>
                  )}
                </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <BottomNav isAdmin={profile?.role === "admin"} />
    </div>
  );
}
