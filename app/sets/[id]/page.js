"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import TopBar from "../../../components/TopBar";

export default function SetDetailPage() {
  const router = useRouter();
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [set, setSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [userId, setUserId] = useState(null);

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
      const { data: setData } = await supabase.from("sets").select("*").eq("id", params.id).single();
      const { data: cardData } = await supabase
        .from("cards")
        .select("*")
        .eq("set_id", params.id)
        .order("number");

      const cardIds = (cardData || []).map((c) => c.id);
      let qtyMap = {};
      if (cardIds.length > 0) {
        const { data: userCards } = await supabase
          .from("user_cards")
          .select("card_id, quantity")
          .eq("user_id", uid)
          .in("card_id", cardIds);
        (userCards || []).forEach((uc) => {
          qtyMap[uc.card_id] = uc.quantity;
        });
      }

      if (active) {
        setUserId(uid);
        setProfile(profileData);
        setSet(setData);
        setCards(cardData || []);
        setQuantities(qtyMap);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router, params.id]);

  const updateQuantity = async (cardId, newQty) => {
    const safeQty = Math.max(0, newQty);
    setQuantities((prev) => ({ ...prev, [cardId]: safeQty }));
    await supabase
      .from("user_cards")
      .upsert({ user_id: userId, card_id: cardId, quantity: safeQty }, { onConflict: "user_id,card_id" });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <span style={{ color: "#7D8A96", fontSize: 14 }}>Cargando...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar profile={profile} title={set?.name || "Set"} onBack={() => router.back()} />

      <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {cards.length === 0 ? (
          <div style={{ textAlign: "center", color: "#7D8A96", fontSize: 13, marginTop: 30 }}>
            Este set todavía no tiene cartas.
          </div>
        ) : (
          cards.map((c) => {
            const qty = quantities[c.id] || 0;
            return (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: qty > 0 ? "#1A2029" : "#141922",
                  border: qty > 0 ? "1px solid #4F9B72" : "1px solid #2B3440",
                  borderRadius: 12,
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 56,
                    flexShrink: 0,
                    borderRadius: 6,
                    background: c.image_url
                      ? `center / cover no-repeat url(${c.image_url})`
                      : "linear-gradient(160deg, #4A8FB8, #B25450)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                  }}
                >
                  {!c.image_url && "🃏"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#DCE3E8" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "#7D8A96" }}>
                    #{c.number} · {c.rarity}
                  </div>
                </div>
                {qty === 0 ? (
                  <button
                    onClick={() => updateQuantity(c.id, 1)}
                    style={{
                      background: "transparent",
                      border: "1px solid #4F9B72",
                      color: "#4F9B72",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    + Añadir
                  </button>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => updateQuantity(c.id, qty - 1)}
                      style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #2B3440", background: "transparent", color: "#B25450", cursor: "pointer" }}
                    >
                      −
                    </button>
                    <span style={{ minWidth: 16, textAlign: "center", color: "#4F9B72", fontWeight: 800 }}>{qty}</span>
                    <button
                      onClick={() => updateQuantity(c.id, qty + 1)}
                      style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid #4F9B72", background: "transparent", color: "#4F9B72", cursor: "pointer" }}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
