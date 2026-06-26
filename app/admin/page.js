"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import TopBar from "../../components/TopBar";
import { uploadImage } from "../../lib/uploadImage";
import BottomNav from "../../components/BottomNav";

const LANGS = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "中文" },
];

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "#141922",
  border: "1px solid #2B3440",
  borderRadius: 8,
  padding: "9px 10px",
  color: "#DCE3E8",
  fontSize: 13,
  outline: "none",
};
const labelStyle = { fontSize: 11.5, fontWeight: 700, color: "#7D8A96", marginBottom: 4, display: "block" };
const btnStyle = {
  background: "#10141B",
  color: "white",
  border: "1px solid #2B3440",
  borderRadius: 10,
  padding: "10px 0",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};
const cancelBtnStyle = {
  background: "none",
  border: "1px solid #2B3440",
  color: "#7D8A96",
  borderRadius: 10,
  padding: "9px 0",
  fontWeight: 700,
  fontSize: 12.5,
  cursor: "pointer",
};

const EMPTY_SET_FORM = { lang: "es", name: "", series: "", release_date: "", image_url: "" };
const EMPTY_CARD_FORM = { lang: "es", set_id: "", name: "", number: "", rarity: "Común", image_url: "", description: "" };
const EMPTY_COL_FORM = { lang: "es", name: "", description: "", image_url: "", setIds: [] };

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [section, setSection] = useState("sets"); // sets | cards | collections
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  const [sets, setSets] = useState([]);
  const [cards, setCards] = useState([]);
  const [collections, setCollections] = useState([]);
  const [collectionItems, setCollectionItems] = useState([]);

  const [setForm, setSetForm] = useState(EMPTY_SET_FORM);
  const [cardForm, setCardForm] = useState(EMPTY_CARD_FORM);
  const [colForm, setColForm] = useState(EMPTY_COL_FORM);

  const [editingSetId, setEditingSetId] = useState(null);
  const [editingCardId, setEditingCardId] = useState(null);
  const [editingCollectionId, setEditingCollectionId] = useState(null);

  const flash = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(""), 2500);
  };

  const loadAll = async () => {
    const { data: setsData } = await supabase.from("sets").select("*").order("created_at");
    const { data: cardsData } = await supabase.from("cards").select("*").order("number");
    const { data: colsData } = await supabase.from("collections").select("*").order("created_at");
    const { data: itemsData } = await supabase.from("collection_items").select("*");
    setSets(setsData || []);
    setCards(cardsData || []);
    setCollections(colsData || []);
    setCollectionItems(itemsData || []);
  };

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

      if (!profileData || profileData.role !== "admin") {
        router.replace("/collections");
        return;
      }

      await loadAll();
      if (active) {
        setProfile(profileData);
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

  const handleFileUpload = async (file, folder, onDone) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, folder);
      onDone(url);
      flash("Imagen subida.");
    } catch (err) {
      flash("Error al subir la imagen: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // ----- SETS -----
  const submitSet = async () => {
    if (!setForm.name.trim()) return;
    const fields = {
      lang: setForm.lang,
      name: setForm.name.trim(),
      series: setForm.series.trim(),
      release_date: setForm.release_date.trim(),
      image_url: setForm.image_url.trim() || null,
    };
    if (editingSetId) {
      const { error } = await supabase.from("sets").update(fields).eq("id", editingSetId);
      if (error) {
        flash("Error: " + error.message);
        return;
      }
      setEditingSetId(null);
      flash("Set actualizado.");
    } else {
      const { error } = await supabase.from("sets").insert(fields);
      if (error) {
        flash("Error: " + error.message);
        return;
      }
      flash("Set añadido.");
    }
    setSetForm({ ...EMPTY_SET_FORM, lang: setForm.lang });
    await loadAll();
  };
  const startEditSet = (s) => {
    setEditingSetId(s.id);
    setSetForm({ lang: s.lang, name: s.name || "", series: s.series || "", release_date: s.release_date || "", image_url: s.image_url || "" });
  };
  const cancelEditSet = () => {
    setEditingSetId(null);
    setSetForm({ ...EMPTY_SET_FORM, lang: setForm.lang });
  };
  const deleteSet = async (id) => {
    await supabase.from("sets").delete().eq("id", id);
    await loadAll();
    flash("Set eliminado.");
  };

  // ----- CARDS -----
  const setsForCardLang = sets.filter((s) => s.lang === cardForm.lang);
  const submitCard = async () => {
    if (!cardForm.name.trim() || !cardForm.set_id) return;
    const fields = {
      set_id: cardForm.set_id,
      name: cardForm.name.trim(),
      number: cardForm.number ? parseInt(cardForm.number, 10) : null,
      rarity: cardForm.rarity,
      image_url: cardForm.image_url.trim() || null,
      description: cardForm.description.trim() || null,
    };
    if (editingCardId) {
      const { error } = await supabase.from("cards").update(fields).eq("id", editingCardId);
      if (error) {
        flash("Error: " + error.message);
        return;
      }
      setEditingCardId(null);
      flash("Carta actualizada.");
    } else {
      const { error } = await supabase.from("cards").insert(fields);
      if (error) {
        flash("Error: " + error.message);
        return;
      }
      flash("Carta añadida.");
    }
    setCardForm({ ...cardForm, name: "", number: "", image_url: "", description: "" });
    await loadAll();
  };
  const startEditCard = (c) => {
    setEditingCardId(c.id);
    const parentSet = sets.find((s) => s.id === c.set_id);
    setCardForm({
      lang: parentSet?.lang || "es",
      set_id: c.set_id,
      name: c.name || "",
      number: c.number ?? "",
      rarity: c.rarity || "Común",
      image_url: c.image_url || "",
      description: c.description || "",
    });
  };
  const cancelEditCard = () => {
    setEditingCardId(null);
    setCardForm({ ...cardForm, name: "", number: "", image_url: "", description: "" });
  };
  const deleteCard = async (id) => {
    await supabase.from("cards").delete().eq("id", id);
    await loadAll();
    flash("Carta eliminada.");
  };

  // ----- COLLECTIONS -----
  const setsForColLang = sets.filter((s) => s.lang === colForm.lang);
  const toggleColSet = (setId) => {
    setColForm((prev) => ({
      ...prev,
      setIds: prev.setIds.includes(setId) ? prev.setIds.filter((id) => id !== setId) : [...prev.setIds, setId],
    }));
  };
  const submitCollection = async () => {
    if (!colForm.name.trim()) return;
    const fields = {
      name: colForm.name.trim(),
      description: colForm.description.trim() || null,
      image_url: colForm.image_url.trim() || null,
    };

    let collectionId = editingCollectionId;
    if (editingCollectionId) {
      const { error } = await supabase.from("collections").update(fields).eq("id", editingCollectionId);
      if (error) {
        flash("Error: " + error.message);
        return;
      }
      // Reemplazamos sus sets: quitamos todos los anteriores y ponemos la selección actual.
      await supabase.from("collection_items").delete().eq("collection_id", editingCollectionId);
    } else {
      const { data: newCol, error } = await supabase.from("collections").insert(fields).select().single();
      if (error || !newCol) {
        flash("Error: " + (error?.message || "no se pudo crear"));
        return;
      }
      collectionId = newCol.id;
    }

    if (colForm.setIds.length > 0) {
      const rows = colForm.setIds.map((setId) => ({ collection_id: collectionId, set_id: setId }));
      await supabase.from("collection_items").insert(rows);
    }

    setEditingCollectionId(null);
    setColForm({ ...EMPTY_COL_FORM, lang: colForm.lang });
    await loadAll();
    flash(editingCollectionId ? "Colección actualizada." : "Colección añadida.");
  };
  const startEditCollection = (c) => {
    setEditingCollectionId(c.id);
    const itemSetIds = collectionItems.filter((i) => i.collection_id === c.id).map((i) => i.set_id);
    const firstSet = sets.find((s) => itemSetIds.includes(s.id));
    setColForm({
      lang: firstSet?.lang || "es",
      name: c.name || "",
      description: c.description || "",
      image_url: c.image_url || "",
      setIds: itemSetIds,
    });
  };
  const cancelEditCollection = () => {
    setEditingCollectionId(null);
    setColForm({ ...EMPTY_COL_FORM, lang: colForm.lang });
  };
  const deleteCollection = async (id) => {
    await supabase.from("collections").delete().eq("id", id);
    await loadAll();
    flash("Colección eliminada.");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar profile={profile} title="Configuración" />

      <div style={{ display: "flex", gap: 6, padding: "10px 16px 0" }}>
        {[
          { key: "sets", label: "Sets" },
          { key: "cards", label: "Cartas" },
          { key: "collections", label: "Colecciones" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setSection(t.key)}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 8,
              border: section === t.key ? "2px solid #4A8FB8" : "1px solid #2B3440",
              background: "#141922",
              color: section === t.key ? "#4A8FB8" : "#7D8A96",
              fontWeight: 800,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ margin: "10px 16px 0", background: "#1A2029", color: "#4F9B72", fontWeight: 700, fontSize: 12.5, padding: "8px 10px", borderRadius: 8, textAlign: "center" }}>
          {msg}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {section === "sets" && (
          <>
            <div>
              <label style={labelStyle}>Idioma</label>
              <select disabled={!!editingSetId} style={{ ...inputStyle, opacity: editingSetId ? 0.6 : 1 }} value={setForm.lang} onChange={(e) => setSetForm({ ...setForm, lang: e.target.value })}>
                {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Nombre del set</label>
              <input style={inputStyle} value={setForm.name} onChange={(e) => setSetForm({ ...setForm, name: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Serie</label>
              <input style={inputStyle} value={setForm.series} onChange={(e) => setSetForm({ ...setForm, series: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Fecha de lanzamiento</label>
              <input style={inputStyle} value={setForm.release_date} onChange={(e) => setSetForm({ ...setForm, release_date: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Imagen del set (opcional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files[0], "sets", (url) => setSetForm((p) => ({ ...p, image_url: url })))}
                style={{ ...inputStyle, padding: "6px" }}
              />
              {setForm.image_url && (
                <img src={setForm.image_url} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, marginTop: 6 }} />
              )}
            </div>
            <button style={btnStyle} disabled={uploading} onClick={submitSet}>
              {uploading ? "Subiendo imagen..." : editingSetId ? "Guardar cambios" : "+ Añadir set"}
            </button>
            {editingSetId && <button style={cancelBtnStyle} onClick={cancelEditSet}>Cancelar edición</button>}

            <div style={{ fontWeight: 800, color: "#DCE3E8", fontSize: 13, marginTop: 8 }}>Sets existentes</div>
            {sets.map((s) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "#141922", border: "1px solid #2B3440", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {s.image_url && <img src={s.image_url} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 6 }} />}
                  <span style={{ fontSize: 13 }}>{s.name} <span style={{ color: "#7D8A96" }}>({s.lang})</span></span>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => startEditSet(s)} style={{ background: "none", border: "none", color: "#4A8FB8", cursor: "pointer", fontSize: 12 }}>Editar</button>
                  <button onClick={() => deleteSet(s.id)} style={{ background: "none", border: "none", color: "#B25450", cursor: "pointer", fontSize: 12 }}>Eliminar</button>
                </div>
              </div>
            ))}
          </>
        )}

        {section === "cards" && (
          <>
            <div>
              <label style={labelStyle}>Idioma</label>
              <select disabled={!!editingCardId} style={{ ...inputStyle, opacity: editingCardId ? 0.6 : 1 }} value={cardForm.lang} onChange={(e) => setCardForm({ ...cardForm, lang: e.target.value, set_id: "" })}>
                {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Set</label>
              <select disabled={!!editingCardId} style={{ ...inputStyle, opacity: editingCardId ? 0.6 : 1 }} value={cardForm.set_id} onChange={(e) => setCardForm({ ...cardForm, set_id: e.target.value })}>
                <option value="">Selecciona un set...</option>
                {setsForCardLang.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Nombre de la carta</label>
              <input style={inputStyle} value={cardForm.name} onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Número</label>
              <input style={inputStyle} type="number" value={cardForm.number} onChange={(e) => setCardForm({ ...cardForm, number: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Rareza</label>
              <select style={inputStyle} value={cardForm.rarity} onChange={(e) => setCardForm({ ...cardForm, rarity: e.target.value })}>
                {["Común", "Infrecuente", "Rara", "Rara Holo", "Ultra Rara", "Secreta"].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Imagen de la carta (opcional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files[0], "cards", (url) => setCardForm((p) => ({ ...p, image_url: url })))}
                style={{ ...inputStyle, padding: "6px" }}
              />
              {cardForm.image_url && (
                <img src={cardForm.image_url} alt="" style={{ width: 60, height: 84, objectFit: "cover", borderRadius: 8, marginTop: 6 }} />
              )}
            </div>
            <div>
              <label style={labelStyle}>Descripción</label>
              <textarea style={{ ...inputStyle, minHeight: 60 }} value={cardForm.description} onChange={(e) => setCardForm({ ...cardForm, description: e.target.value })} />
            </div>
            <button style={btnStyle} disabled={!cardForm.set_id || uploading} onClick={submitCard}>
              {uploading ? "Subiendo imagen..." : editingCardId ? "Guardar cambios" : "+ Añadir carta"}
            </button>
            {editingCardId && <button style={cancelBtnStyle} onClick={cancelEditCard}>Cancelar edición</button>}

            <div style={{ fontWeight: 800, color: "#DCE3E8", fontSize: 13, marginTop: 8 }}>Todas las cartas</div>
            {sets.map((s) => {
              const setCards = cards.filter((c) => c.set_id === s.id);
              if (setCards.length === 0) return null;
              return (
                <div key={s.id}>
                  <div style={{ fontSize: 11, color: "#7D8A96", fontWeight: 700, margin: "6px 0 4px" }}>{s.name} ({s.lang})</div>
                  {setCards.map((c) => (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "#141922", border: "1px solid #2B3440", borderRadius: 8, padding: "8px 10px", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {c.image_url && <img src={c.image_url} alt="" style={{ width: 28, height: 39, objectFit: "cover", borderRadius: 4 }} />}
                        <span style={{ fontSize: 13 }}>{c.name}</span>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => startEditCard(c)} style={{ background: "none", border: "none", color: "#4A8FB8", cursor: "pointer", fontSize: 12 }}>Editar</button>
                        <button onClick={() => deleteCard(c.id)} style={{ background: "none", border: "none", color: "#B25450", cursor: "pointer", fontSize: 12 }}>Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        )}

        {section === "collections" && (
          <>
            <div>
              <label style={labelStyle}>Idioma de los sets a incluir</label>
              <select style={inputStyle} value={colForm.lang} onChange={(e) => setColForm({ ...colForm, lang: e.target.value })}>
                {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Nombre de la colección</label>
              <input style={inputStyle} value={colForm.name} onChange={(e) => setColForm({ ...colForm, name: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Descripción</label>
              <textarea style={{ ...inputStyle, minHeight: 60 }} value={colForm.description} onChange={(e) => setColForm({ ...colForm, description: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Imagen de la colección (opcional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e.target.files[0], "collections", (url) => setColForm((p) => ({ ...p, image_url: url })))}
                style={{ ...inputStyle, padding: "6px" }}
              />
              {colForm.image_url && (
                <img src={colForm.image_url} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, marginTop: 6 }} />
              )}
            </div>
            <div>
              <label style={labelStyle}>Sets incluidos ({colForm.setIds.length} seleccionados) — opcional, puedes crear la colección y añadirlos después</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto", border: "1px solid #2B3440", borderRadius: 8, padding: 8 }}>
                {setsForColLang.length === 0 && <span style={{ fontSize: 12, color: "#7D8A96" }}>No hay sets en este idioma.</span>}
                {setsForColLang.map((s) => (
                  <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, cursor: "pointer" }}>
                    <input type="checkbox" checked={colForm.setIds.includes(s.id)} onChange={() => toggleColSet(s.id)} />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
            <button style={btnStyle} disabled={!colForm.name.trim() || uploading} onClick={submitCollection}>
              {uploading ? "Subiendo imagen..." : editingCollectionId ? "Guardar cambios" : "+ Añadir colección"}
            </button>
            {editingCollectionId && <button style={cancelBtnStyle} onClick={cancelEditCollection}>Cancelar edición</button>}

            <div style={{ fontWeight: 800, color: "#DCE3E8", fontSize: 13, marginTop: 8 }}>Colecciones existentes</div>
            {collections.map((c) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "#141922", border: "1px solid #2B3440", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {c.image_url && <img src={c.image_url} alt="" style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 6 }} />}
                  <span style={{ fontSize: 13 }}>
                    {c.name} <span style={{ color: "#7D8A96" }}>({collectionItems.filter((i) => i.collection_id === c.id).length} sets)</span>
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => startEditCollection(c)} style={{ background: "none", border: "none", color: "#4A8FB8", cursor: "pointer", fontSize: 12 }}>Editar</button>
                  <button onClick={() => deleteCollection(c.id)} style={{ background: "none", border: "none", color: "#B25450", cursor: "pointer", fontSize: 12 }}>Eliminar</button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <BottomNav isAdmin={true} />
    </div>
  );
}
