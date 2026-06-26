"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

function getSeenMap() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("seenTrades") || "{}");
  } catch {
    return {};
  }
}

export default function NotificationBell({ userId }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [unreadTrades, setUnreadTrades] = useState([]);

  const refresh = async () => {
    const { count } = await supabase
      .from("friend_requests")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("status", "pending");
    setRequestCount(count || 0);

    const { data: trades } = await supabase
      .from("trades")
      .select(
        "id, proposer_id, receiver_id, proposer:profiles!trades_proposer_id_fkey(username), receiver:profiles!trades_receiver_id_fkey(username)"
      )
      .or(`proposer_id.eq.${userId},receiver_id.eq.${userId}`);

    if (!trades || trades.length === 0) {
      setUnreadTrades([]);
      return;
    }

    const seen = getSeenMap();
    const results = [];
    for (const t of trades) {
      const { data: msgs } = await supabase
        .from("trade_messages")
        .select("id, sender_id, text")
        .eq("trade_id", t.id)
        .order("created_at", { ascending: false })
        .limit(1);
      const last = msgs?.[0];
      if (!last || last.sender_id === userId) continue;
      if (seen[t.id] === last.id) continue;
      const otherName = t.proposer_id === userId ? t.receiver?.username : t.proposer?.username;
      results.push({ tradeId: t.id, friendName: otherName, lastMessage: last.text });
    }
    setUnreadTrades(results);
  };

  useEffect(() => {
    if (!userId) return;
    refresh();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "friend_requests", filter: `receiver_id=eq.${userId}` },
        refresh
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "trade_messages" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const total = requestCount + unreadTrades.length;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ background: "none", border: "none", color: "#DCE3E8", cursor: "pointer", position: "relative", padding: 4 }}
        aria-label="Notificaciones"
      >
        🔔
        {total > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              minWidth: 15,
              height: 15,
              borderRadius: 8,
              background: "#B25450",
              color: "white",
              fontSize: 9,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
            }}
          >
            {total}
          </span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 55 }} />
          <div
            style={{
              position: "absolute",
              top: 30,
              left: 0,
              width: 250,
              maxHeight: 300,
              overflowY: "auto",
              background: "#141922",
              border: "1px solid #2B3440",
              borderRadius: 12,
              boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
              zIndex: 60,
              padding: 8,
            }}
          >
            {total === 0 ? (
              <div style={{ fontSize: 12, color: "#7D8A96", textAlign: "center", padding: 14 }}>
                No tienes notificaciones nuevas.
              </div>
            ) : (
              <>
                {requestCount > 0 && (
                  <button
                    onClick={() => {
                      setOpen(false);
                      router.push("/trade");
                    }}
                    style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid #2B3440", padding: "9px 6px", cursor: "pointer", color: "#DCE3E8", fontSize: 12 }}
                  >
                    👤 Tienes {requestCount} solicitud{requestCount !== 1 ? "es" : ""} de amistad nueva{requestCount !== 1 ? "s" : ""}
                  </button>
                )}
                {unreadTrades.map((t) => (
                  <button
                    key={t.tradeId}
                    onClick={() => {
                      setOpen(false);
                      router.push(`/trade/chat/${t.tradeId}`);
                    }}
                    style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid #2B3440", padding: "9px 6px", cursor: "pointer", color: "#DCE3E8", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    💬 {t.friendName}: {t.lastMessage}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
