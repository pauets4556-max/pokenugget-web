"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import TopBar from "../../../../components/TopBar";

export default function FriendProfilePage() {
  const router = useRouter();
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);
  const [friend, setFriend] = useState(null);
  const [theirDuplicates, setTheirDuplicates] = useState([]);
  const [myDuplicates, setMyDuplicates] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [msg, setMsg] = useState("");

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
      const { data: friendData } = await supabase.from("profiles").select("*").eq("id", params.id).single();

      const { data: theirCards } = await supabase
        .from("user_cards")
        .select("card_id, quantity, cards(id, name, rarity, number, image_url, set_id, sets(name))")
        .eq("user_id", params.id)
        .gt("quantity", 1);

      const { data: myCards } = await supabase
        .from("user_cards")
        .select("card_id, quantity, cards(id, name, rarity, number, image_url, set_id, sets(name))")
        .eq("user_id", uid)
        .gt("quantity", 1);

      if (active) {
        setProfile(profileData);
        setUserId(uid);
        setFriend(friendData);
        setTheirDuplicates(theirCards || []);
        setMyDuplicates(myCards || []);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router, params.id]);

  const proposeTrade = async (myCard) => {
    const { error } = await supabase.from("trades").insert({
      proposer_id: userId,
      receiver_id: params.id,
      offer_card_id: myCard.cards.id,
      request_card_id: selectedCard.cards.id,
    });
    if (error) {
      setMsg("Error: " + error.message);
      return;
    }
    const { data: newTrade } = await supabase
      .from("trades")
      .select("id")
      .eq("proposer_id", userId)
      .eq("receiver_id", params.id)
      .eq("offer_card_id", myCard.cards.id)
      .eq("request_card_id", selectedCard.cards.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (newTrade) {
      await supabase.from("trade_messages").insert({
        trade_id: newTrade.id,
        sender_id: userId,
        text: `Te propongo intercambiar mi "${myCard.cards.name}" por tu "${selectedCard.cards.name}". ¿Te parece bien?`,
      });
      router.push(`/trade/chat/${newTrade.id}`);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <span style={{ color: "#7D8A96", fontSize: 14 }}>Cargando...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
      <TopBar profile={profile} title={friend?.username || "Amigo"} onBack={() => router.push("/trade")} />

      <div style={{ padding: "10px 16px 0", fontSize: 12, color: "#7D8A96" }}>
        Cartas repetidas de tu amigo, listas para intercambiar:
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {theirDuplicates.length === 0 ? (
          <div style={{ textAlign: "center", color: "#7D8A96", fontSize: 13, marginTop: 30 }}>
            Tu amigo no tiene cartas repetidas ahora mismo.
          </div>
        ) : (
          theirDuplicates.map((uc) => (
            <div key={uc.card_id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#141922", border: "1px solid #2B3440", borderRadius: 12, padding: "10px 12px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#DCE3E8" }}>{uc.cards?.name}</div>
                <div style={{ fontSize: 10.5, color: "#7D8A96" }}>{uc.cards?.sets?.name} · tiene {uc.quantity}</div>
              </div>
              <button
                onClick={() => setSelectedCard(uc)}
                style={{ flexShrink: 0, background: "transparent", border: "1px solid #4A8FB8", color: "#4A8FB8", borderRadius: 8, padding: "6px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
              >
                Proponer trade
              </button>
            </div>
          ))
        )}
      </div>

      {selectedCard && (
        <div
          onClick={() => setSelectedCard(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(5,7,10,0.78)", display: "flex", alignItems: "flex-end", zIndex: 50 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxHeight: "75%", background: "#141922", borderTop: "1px solid #2B3440", borderRadius: "16px 16px 0 0", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}
          >
            <div style={{ fontWeight: 800, color: "#DCE3E8", fontSize: 14, textAlign: "center" }}>
              Pides: {selectedCard.cards?.name}
            </div>
            <div style={{ fontSize: 12, color: "#7D8A96", textAlign: "center" }}>Elige una de tus cartas repetidas para ofrecer</div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {myDuplicates.length === 0 ? (
                <div style={{ textAlign: "center", color: "#7D8A96", fontSize: 12.5, marginTop: 10 }}>
                  No tienes cartas repetidas para ofrecer todavía.
                </div>
              ) : (
                myDuplicates.map((uc) => (
                  <button
                    key={uc.card_id}
                    onClick={() => proposeTrade(uc)}
                    style={{ display: "flex", alignItems: "center", gap: 10, background: "#1A2029", border: "1px solid #2B3440", borderRadius: 10, padding: "8px 10px", cursor: "pointer", textAlign: "left" }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#DCE3E8" }}>{uc.cards?.name}</div>
                      <div style={{ fontSize: 10.5, color: "#7D8A96" }}>{uc.cards?.sets?.name} · tienes {uc.quantity}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
            {msg && <div style={{ color: "#B25450", fontSize: 12, textAlign: "center" }}>{msg}</div>}
            <button onClick={() => setSelectedCard(null)} style={{ background: "none", border: "1px solid #2B3440", color: "#7D8A96", borderRadius: 8, padding: "8px 0", fontSize: 12, cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
