"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import TopBar from "../../../components/TopBar";

export default function MyCollectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const lang = searchParams.get("lang") || "es";

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [collection, setCollection] = useState(null);
  const [sets, setSets] = useState([]);
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
      const { data: col } = await supabase.from("collections").select("*").eq("id", params.id).single();
      const { data: collItems } = await supabase
        .from("collection_items")
        .select("set_id, sets(*)")
        .eq("collection_id", params.id);

      const filteredSets = (collItems || [])
        .map((i) => i.sets)
        .filter((s) => s && s.lang === lang);

      const setIds = filteredSets.map((s) => s.id);
      let cardsBySet = {};
      if (setIds.length > 0) {
        const { data: cardRows } = await supabase.from("cards").select("id, set_id").in("set_id", setIds);
        (cardRows || []).forEach((c) => {
          cardsBySet[c.set_id] = cardsBySet[c.set_id] || [];
          cardsBySet[c.set_id].push(c.id);
        });
      }

      const { data: userCards } = await supabase.from("user_cards").select("card_id, quantity").eq("user_id", uid);
      const qtyMap = {};
      (userCards || []).forEach((uc) => {
        qtyMap[uc.card_id] = uc.quantity;
      });

      const setsWithStats = filteredSets.map((s) => {
        const cardIds = cardsBySet[s.id] || [];
        let ownedVariety = 0;
        let duplicates = 0;
        cardIds.forEach((cid) => {
          const q = qtyMap[cid] || 0;
          if (q > 0) ownedVariety += 1;
          if (q > 1) duplicates += q - 1;
        });
        return { ...s, total: cardIds.length, ownedVariety, duplicates };
      });

      if (active) {
        setProfile(profileData);
        setCollection(col);
        setSets(setsWithStats);
        setQuantities(qtyMap);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router, params.id, lang]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <span style={{ color: "#7D8A96", fontSize: 14 }}>Cargando...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar profile={profile} title={collection?.name || "Colección"} onBack={() => router.push("/my-collection")} />

      <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {sets.length === 0 ? (
          <div style={{ textAlign: "center", color: "#7D8A96", fontSize: 13, marginTop: 30 }}>
            Esta colección no tiene sets en este idioma.
          </div>
        ) : (
          sets.map((s) => {
            const pct = s.total ? Math.round((s.ownedVariety / s.total) * 100) : 0;
            return (
              <Link
                key={s.id}
                href={`/sets/${s.id}`}
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
                {s.image_url && (
                  <img src={s.image_url} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 10, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: "#DCE3E8", fontSize: 14.5 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "#7D8A96", marginTop: 2 }}>
                  {s.series} {s.release_date ? `· ${s.release_date}` : ""}
                </div>
                <div style={{ marginTop: 8, height: 5, borderRadius: 4, background: "#2B3440", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "#4A8FB8" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 11.5, color: "#4A8FB8", fontWeight: 700 }}>
                    {s.ownedVariety}/{s.total} ({pct}%)
                  </span>
                  {s.duplicates > 0 && (
                    <span style={{ fontSize: 11, color: "#4F9B72", fontWeight: 700 }}>+{s.duplicates} repetidas</span>
                  )}
                </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
