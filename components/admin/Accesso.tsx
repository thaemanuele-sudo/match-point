"use client";
import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Errore, Logo, errMsg } from "./comuni";

/** Form email + password nello stile della dashboard. L'esito vero lo decide il database (ruolo admin). */
export function Accesso({ sb, onEntrato }: { sb: SupabaseClient; onEntrato: () => void }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [occ, setOcc] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const entra = async (e: React.FormEvent) => {
    e.preventDefault();
    setOcc(true); setErr(null);
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pwd });
    setOcc(false);
    if (error) return setErr(error.message === "Invalid login credentials" ? "Email o password non corrette." : errMsg(error));
    onEntrato();
  };

  return (
    <div className="db-accesso">
      <form className="db-foglio" onSubmit={entra}>
        <Logo size={36} />
        <h1>Match Point Admin</h1>
        <p>Accedi con l&apos;account amministratore.</p>
        <div className="db-gruppo">
          <label><span>Email</span><input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label><span>Password</span><input type="password" autoComplete="current-password" required value={pwd} onChange={(e) => setPwd(e.target.value)} /></label>
        </div>
        <Errore testo={err} />
        <button type="submit" className="db-btn" disabled={occ || !email || !pwd}>{occ ? "Accesso…" : "Accedi"}</button>
      </form>
    </div>
  );
}
