"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import TopBar from "../../components/TopBar";
import BottomNav from "../../components/BottomNav";

export default function TradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);

  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [friends, setFriends] = useState([]);
  const [trades, setTrades] = useState([]);

  const loadAll = async (uid) => {
    const { data: receivedReq } = await supabase
      .from("friend_requests")
      .select("id, sender_id, profiles!friend_requests_sender_id_fkey(username, code)")
      .eq("receiver_id", uid)
      .eq("status", "pending");

    const { data: sentReq } = await supabase
      .from("friend_requests")
      .select("id, receiver_id, profiles!friend_requests_receiver_id_fkey(username, code)")
      .eq("sender_id", uid)
      .eq("status", "pending");

    const { data: friendRows } = await supabase
      .from("friends")
      .select("friend_id, profiles!friends_friend_id_fkey(id, username, code)")
      .eq("user_id", uid);

    const { data: tradeRows } = await supabase
      .from("trades")
      .select(
        "id, status, proposer_id, receiver_id, offer_card:cards!trades_offer_card_id_fkey(name), request_card:cards!trades_request_card_id_fkey(name), proposer:profiles!trades_proposer_id_fkey(username), receiver:profiles!trades_receiver_id_fkey(username)"
      )
      .or(`proposer_id.eq.${uid},receiver_id.eq.${uid}`)
      .order("created_at", { ascending: false });

    setReceived(receivedReq || []);
    setSent(sentReq || []);
    setFriends((friendRows || []).map((f) => f.profiles));
    setTrades(tradeRows || []);
  };

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

      await loadAll(uid);
      if (active) {
        setUserId(uid);
        setProfile(profileData);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  const flash = (text, isError) => {
    if (isError) setError(text);
    else setMsg(text);
    setTimeout(() => {
      setError("");
      setMsg("");
    }, 2500);
  };

  const sendRequest = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    const { data: target } = await supabase.from("profiles").select("id, username").eq("code", code).maybeSingle();
    if (!target) {
      flash("No se ha encontrado ningún usuario con ese código.", true);
      return;
    }
    if (target.id === userId) {
      flash("No puedes añadirte a ti mismo.", true);
      return;
    }
    const { error: insertError } = await supabase
      .from("friend_requests")
      .insert({ sender_id: userId, receiver_id: target.id });
    if (insertError) {
      flash(insertError.code === "23505" ? "Ya le has enviado una solicitud." : insertError.message, true);
      return;
    }
    setCodeInput("");
    flash("Solicitud enviada a " + target.username + ".");
    await loadAll(userId);
  };

  const acceptRequest = async (req) => {
    await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", req.id);
    await supabase.from("friends").insert([
      { user_id: req.sender_id, friend_id: userId },
      { user_id: userId, friend_id: req.sender_id },
    ]);
    await loadAll(userId);
    flash("Ahora sois amigos.");
  };

  const rejectRequest = async (req) => {
    await supabase.from("friend_requests").update({ status: "declined" }).eq("id", req.id);
    await loadAll(userId);
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
      <TopBar profile={profile} title="Trade" />

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "#141922", border: "1px solid #2B3440", borderRadius: 12, padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 10.5, color: "#7D8A96", fontWeight: 700 }}>TU CÓDIGO</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#4A8FB8", marginTop: 4, fontFamily: "monospace" }}>
            {profile?.code}
          </div>
        </div>

        {received.length > 0 && (
          <div>
            <div style={{ fontWeight: 800, color: "#DCE3E8", fontSize: 13.5, marginBottom: 8 }}>
              Solicitudes recibidas ({received.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {received.map((r) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "#141922", border: "1px solid #4A8FB8", borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#DCE3E8" }}>{r.profiles?.username}</div>
                  </div>
                  <button onClick={() => acceptRequest(r)} style={{ background: "transparent", border: "1px solid #4F9B72", color: "#4F9B72", borderRadius: 8, padding: "5px 10px", fontSize: 11.5, cursor: "pointer" }}>
                    Aceptar
                  </button>
                  <button onClick={() => rejectRequest(r)} style={{ background: "transparent", border: "1px solid #B25450", color: "#B25450", borderRadius: 8, padding: "5px 10px", fontSize: 11.5, cursor: "pointer" }}>
                    Rechazar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div style={{ fontWeight: 800, color: "#DCE3E8", fontSize: 13.5, marginBottom: 8 }}>Añadir amigo por código</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="#CODIGO"
              style={{ flex: 1, background: "#141922", border: "1px solid #2B3440", borderRadius: 8, padding: "9px 10px", color: "#DCE3E8", fontSize: 13, outline: "none" }}
            />
            <button onClick={sendRequest} style={{ background: "#10141B", color: "white", border: "1px solid #2B3440", borderRadius: 8, padding: "0 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Enviar
            </button>
          </div>
          {error && <div style={{ color: "#B25450", fontSize: 11.5, marginTop: 6 }}>{error}</div>}
          {msg && <div style={{ color: "#4F9B72", fontSize: 11.5, marginTop: 6, fontWeight: 700 }}>{msg}</div>}
        </div>

        {sent.length > 0 && (
          <div>
            <div style={{ fontWeight: 800, color: "#DCE3E8", fontSize: 13.5, marginBottom: 8 }}>Solicitudes enviadas</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sent.map((r) => (
                <div key={r.id} style={{ background: "#141922", border: "1px solid #2B3440", borderRadius: 12, padding: "10px 12px", opacity: 0.7, fontSize: 13 }}>
                  {r.profiles?.username} <span style={{ color: "#7D8A96", fontSize: 11 }}>· pendiente</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div style={{ fontWeight: 800, color: "#DCE3E8", fontSize: 13.5, marginBottom: 8 }}>Tus amigos ({friends.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {friends.map((f) => (
              <Link
                key={f.id}
                href={`/trade/friend/${f.id}`}
                style={{ display: "block", background: "#141922", border: "1px solid #2B3440", borderRadius: 12, padding: "10px 12px", textDecoration: "none", color: "#DCE3E8", fontSize: 13, fontWeight: 700 }}
              >
                {f.username} <span style={{ color: "#7D8A96", fontSize: 11, fontFamily: "monospace" }}>{f.code}</span>
              </Link>
            ))}
            {friends.length === 0 && <div style={{ fontSize: 12.5, color: "#7D8A96" }}>Todavía no tienes amigos añadidos.</div>}
          </div>
        </div>

        {trades.length > 0 && (
          <div>
            <div style={{ fontWeight: 800, color: "#DCE3E8", fontSize: 13.5, marginBottom: 8 }}>Tus trades</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {trades.map((t) => {
                const otherName = t.proposer_id === userId ? t.receiver?.username : t.proposer?.username;
                return (
                  <Link
                    key={t.id}
                    href={`/trade/chat/${t.id}`}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#141922", border: "1px solid #2B3440", borderRadius: 12, padding: "10px 12px", textDecoration: "none" }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#DCE3E8" }}>{otherName}</div>
                      <div style={{ fontSize: 11, color: "#7D8A96" }}>
                        {t.offer_card?.name} ↔ {t.request_card?.name}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: t.status === "accepted" ? "#4F9B72" : t.status === "declined" ? "#B25450" : "#7D8A96" }}>
                      {t.status === "pending" ? "Pendiente" : t.status === "accepted" ? "Aceptado" : "Rechazado"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <BottomNav isAdmin={profile?.role === "admin"} />
    </div>
  );
}
