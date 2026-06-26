"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import TopBar from "../../../components/TopBar";

export default function CollectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const lang = searchParams.get("lang") || "es";

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [collection, setCollection] = useState(null);
  const [sets, setSets] = useState([]);

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

      const { data: col } = await supabase.from("collections").select("*").eq("id", params.id).single();
      const { data: items } = await supabase
        .from("collection_items")
        .select("set_id, sets(*)")
        .eq("collection_id", params.id);

      const filteredSets = (items || [])
        .map((i) => i.sets)
        .filter((s) => s && s.lang === lang);

      if (active) {
        setProfile(profileData);
        setCollection(col);
        setSets(filteredSets);
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
      <TopBar profile={profile} title={collection?.name || "Colección"} onBack={() => router.push("/collections")} />

      <div style={{ padding: "12px 16px 0", fontSize: 12, color: "#7D8A96" }}>{collection?.description}</div>

      <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {sets.length === 0 ? (
          <div style={{ textAlign: "center", color: "#7D8A96", fontSize: 13, marginTop: 30 }}>
            Esta colección no tiene sets en este idioma.
          </div>
        ) : (
          sets.map((s) => (
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
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
