"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import TopBar from "../../../../components/TopBar";

export default function TradeChatPage() {
  const router = useRouter();
  const params = useParams();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);
  const [trade, setTrade] = useState(null);
  const [otherUsername, setOtherUsername] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

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

      const { data: tradeData } = await supabase
        .from("trades")
        .select(
          "*, offer_card:cards!trades_offer_card_id_fkey(name), request_card:cards!trades_request_card_id_fkey(name), proposer:profiles!trades_proposer_id_fkey(username), receiver:profiles!trades_receiver_id_fkey(username)"
        )
        .eq("id", params.id)
        .single();

      const { data: messageData } = await supabase
        .from("trade_messages")
        .select("*")
        .eq("trade_id", params.id)
        .order("created_at");

      if (active) {
        setUserId(uid);
        setProfile(profileData);
        setTrade(tradeData);
        setOtherUsername(tradeData?.proposer_id === uid ? tradeData?.receiver?.username : tradeData?.proposer?.username);
        setMessages(messageData || []);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router, params.id]);

  // Tiempo real: escucha mensajes nuevos y cambios de estado del trade,
  // sin que nadie tenga que recargar la página.
  useEffect(() => {
    const channel = supabase
      .channel(`trade-chat-${params.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trade_messages", filter: `trade_id=eq.${params.id}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trades", filter: `id=eq.${params.id}` },
        (payload) => {
          setTrade((prev) => ({ ...prev, status: payload.new.status }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id]);

  const send = async () => {
    if (!text.trim()) return;
    const messageText = text.trim();
    setText("");
    await supabase.from("trade_messages").insert({ trade_id: params.id, sender_id: userId, text: messageText });
    // No hace falta recargar: la suscripción de arriba añadirá el mensaje solo,
    // tanto en tu pantalla como en la de tu amigo.
  };

  const updateStatus = async (status) => {
    await supabase.from("trades").update({ status }).eq("id", params.id);
    setTrade((prev) => ({ ...prev, status }));
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
      <TopBar profile={profile} title={otherUsername || "Trade"} onBack={() => router.push("/trade")} />

      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ background: "#141922", border: "1px solid #2B3440", borderRadius: 12, padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 11.5, color: "#7D8A96" }}>
            Ofreces <b style={{ color: "#DCE3E8" }}>{trade?.offer_card?.name}</b>
            <br />
            Pides <b style={{ color: "#DCE3E8" }}>{trade?.request_card?.name}</b>
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, color: trade?.status === "accepted" ? "#4F9B72" : trade?.status === "declined" ? "#B25450" : "#7D8A96" }}>
            {trade?.status === "pending" ? "Pendiente" : trade?.status === "accepted" ? "Aceptado" : "Rechazado"}
          </span>
        </div>
        {trade?.status === "pending" && (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => updateStatus("accepted")} style={{ flex: 1, background: "transparent", border: "1px solid #4F9B72", color: "#4F9B72", borderRadius: 8, padding: "7px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Marcar acordado
            </button>
            <button onClick={() => updateStatus("declined")} style={{ flex: 1, background: "transparent", border: "1px solid #B25450", color: "#B25450", borderRadius: 8, padding: "7px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Rechazar
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.sender_id === userId ? "flex-end" : "flex-start" }}>
            <div
              style={{
                maxWidth: "78%",
                background: m.sender_id === userId ? "#4A8FB8" : "#141922",
                color: m.sender_id === userId ? "#0B0E13" : "#DCE3E8",
                border: m.sender_id === userId ? "none" : "1px solid #2B3440",
                borderRadius: 12,
                padding: "8px 12px",
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, padding: "10px 16px 16px" }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Escribe un mensaje..."
          style={{ flex: 1, background: "#141922", border: "1px solid #2B3440", borderRadius: 20, padding: "9px 14px", fontSize: 13, color: "#DCE3E8", outline: "none" }}
        />
        <button onClick={send} style={{ background: "#10141B", color: "white", border: "1px solid #2B3440", borderRadius: 20, padding: "0 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Enviar
        </button>
      </div>
    </div>
  );
}
