"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import TopBar from "../../../components/TopBar";
import PriceChart from "../../../components/PriceChart";
import { generatePriceHistory } from "../../../lib/priceHistory";
import { supabase as sb } from "../../../lib/supabaseClient";

export default function SetDetailPage() {
  const router = useRouter();
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [set, setSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [quantities, setQuantities] = useState({}); // { cardId: qty }
  const [userId, setUserId] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [realPriceHistory, setRealPriceHistory] = useState(null); // null = no consultado todavía, [] = sin datos reales

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

  const openCard = async (card) => {
    setSelectedCard(card);
    setRealPriceHistory(null);
    const { data } = await sb
      .from("card_prices")
      .select("price, recorded_at")
      .eq("card_id", card.id)
      .order("recorded_at", { ascending: true });
    setRealPriceHistory(
      (data || []).map((row) => ({
        day: new Date(row.recorded_at).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }),
        price: row.price,
      }))
    );
  };

  const usingRealData = realPriceHistory !== null && realPriceHistory.length > 0;
  const priceHistory = usingRealData
    ? realPriceHistory
    : selectedCard
    ? generatePriceHistory(selectedCard.id, selectedCard.rarity)
    : [];
  const currentPrice = priceHistory[priceHistory.length - 1]?.price ?? 0;
  const previousPrice = priceHistory[priceHistory.length - 2]?.price ?? currentPrice;
  const priceUp = currentPrice >= previousPrice;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
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
                <button
                  onClick={() => openCard(c)}
                  style={{
                    width: 40,
                    height: 56,
                    flexShrink: 0,
                    borderRadius: 6,
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
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
                </button>
                <button
                  onClick={() => openCard(c)}
                  style={{ flex: 1, minWidth: 0, background: "none", border: "none", textAlign: "left", cursor: "pointer", padding: 0 }}
                >
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#DCE3E8" }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "#7D8A96" }}>
                    #{c.number} · {c.rarity}
                  </div>
                </button>
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

      {selectedCard && (
        <div
          onClick={() => setSelectedCard(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(5,7,10,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#141922", border: "1px solid #2B3440", borderRadius: 16, padding: 18, width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}
          >
            <button onClick={() => setSelectedCard(null)} style={{ alignSelf: "flex-end", background: "none", border: "none", color: "#7D8A96", cursor: "pointer", fontSize: 16 }}>✕</button>
            <div
              style={{
                width: "60%",
                aspectRatio: "63/88",
                borderRadius: 10,
                background: selectedCard.image_url
                  ? `center / cover no-repeat url(${selectedCard.image_url})`
                  : "linear-gradient(160deg, #4A8FB8, #B25450)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 40,
              }}
            >
              {!selectedCard.image_url && "🃏"}
            </div>
            <div style={{ fontWeight: 800, color: "#DCE3E8", fontSize: 16 }}>{selectedCard.name}</div>
            <div style={{ fontSize: 11.5, color: "#7D8A96" }}>#{selectedCard.number} · {selectedCard.rarity}</div>
            <div style={{ fontSize: 12.5, color: "#7D8A96", textAlign: "center" }}>
              {selectedCard.description || "Esta carta todavía no tiene descripción."}
            </div>

            <div style={{ width: "100%", background: "#1A2029", border: "1px solid #2B3440", borderRadius: 10, padding: "10px 10px 4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: "#7D8A96", fontWeight: 700 }}>PRECIO CARDMARKET</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#DCE3E8" }}>
                  {currentPrice.toFixed(2)} € {priceUp ? "▲" : "▼"}
                </span>
              </div>
              <PriceChart history={priceHistory} />
              <div style={{ fontSize: 9, color: "#7D8A96", textAlign: "center", marginTop: 2, marginBottom: 4 }}>
                {usingRealData
                  ? "Precio real, actualizado a diario desde Cardmarket"
                  : selectedCard?.pokemon_tcg_id
                  ? "Todavía no hay histórico real guardado — datos de ejemplo por ahora"
                  : "Esta carta no está enlazada a un precio real · datos de ejemplo"}
              </div>
            </div>

            <div style={{ width: "100%" }}>
              {(quantities[selectedCard.id] || 0) === 0 ? (
                <button
                  onClick={() => updateQuantity(selectedCard.id, 1)}
                  style={{ width: "100%", background: "transparent", border: "1px solid #4F9B72", color: "#4F9B72", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  + Añadir a mi colección
                </button>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
                  <button
                    onClick={() => updateQuantity(selectedCard.id, (quantities[selectedCard.id] || 0) - 1)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #2B3440", background: "transparent", color: "#B25450", cursor: "pointer", fontSize: 16 }}
                  >
                    −
                  </button>
                  <span style={{ minWidth: 20, textAlign: "center", color: "#4F9B72", fontWeight: 800, fontSize: 16 }}>
                    {quantities[selectedCard.id] || 0}
                  </span>
                  <button
                    onClick={() => updateQuantity(selectedCard.id, (quantities[selectedCard.id] || 0) + 1)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #4F9B72", background: "transparent", color: "#4F9B72", cursor: "pointer", fontSize: 16 }}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
