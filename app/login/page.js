"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { generateUserCode } from "../../lib/generateCode";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    background: "#141922",
    border: "1px solid #2B3440",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#DCE3E8",
    fontSize: 14,
    outline: "none",
  };

  const handleLogin = async () => {
    setError("");
    if (!username.trim() || !password) {
      setError("Rellena usuario y contraseña.");
      return;
    }
    setLoading(true);
    const { data: profileRow, error: lookupError } = await supabase
      .from("profiles")
      .select("email")
      .ilike("username", username.trim())
      .single();

    if (lookupError || !profileRow) {
      setLoading(false);
      setError("No existe ningún usuario con ese nombre.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profileRow.email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError("Usuario o contraseña incorrectos.");
      return;
    }
    router.replace("/");
  };

  const handleRegister = async () => {
    setError("");
    if (!username.trim() || !email.trim() || !password) {
      setError("Rellena todos los campos.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", username.trim())
      .maybeSingle();
    if (existing) {
      setLoading(false);
      setError("Ya existe un usuario con ese nombre.");
      return;
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (signUpError || !signUpData?.user) {
      setLoading(false);
      setError(signUpError?.message || "No se ha podido crear la cuenta.");
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: signUpData.user.id,
      username: username.trim(),
      email: email.trim(),
      code: generateUserCode(),
      role: "user",
    });

    setLoading(false);
    if (profileError) {
      setError("Cuenta creada, pero hubo un problema guardando el perfil: " + profileError.message);
      return;
    }
    router.replace("/");
  };

  const submit = () => (mode === "login" ? handleLogin() : handleRegister());

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 20px",
        background: "radial-gradient(circle at 50% 28%, #141922 0%, #0B0E13 70%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 12 }}>
        <h1 style={{ textAlign: "center", color: "#4A8FB8", fontSize: 22, marginBottom: 6 }}>
          Poké Nugget TCG
        </h1>
        <div
          style={{
            fontSize: 10.5,
            color: "#7D8A96",
            fontFamily: "monospace",
            letterSpacing: "0.18em",
            textAlign: "center",
          }}
        >
          {mode === "login" ? "ACCESO AL SISTEMA" : "CREAR CUENTA NUEVA"}
        </div>

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Usuario"
          style={inputStyle}
        />
        {mode === "register" && (
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo electrónico"
            type="email"
            style={inputStyle}
          />
        )}
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          type="password"
          style={inputStyle}
        />
        {mode === "register" && (
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirmar contraseña"
            type="password"
            style={inputStyle}
          />
        )}

        {error && <div style={{ color: "#B25450", fontSize: 12.5, textAlign: "center" }}>{error}</div>}

        <button
          onClick={submit}
          disabled={loading}
          style={{
            background: "transparent",
            border: "1px solid #4A8FB8",
            color: "#4A8FB8",
            borderRadius: 6,
            padding: "12px 0",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "0.08em",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Un momento..." : mode === "login" ? "ENTRAR" : "CREAR CUENTA"}
        </button>

        <button
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
          style={{ background: "none", border: "none", color: "#7D8A96", fontSize: 12, cursor: "pointer" }}
        >
          {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </div>
    </div>
  );
}
