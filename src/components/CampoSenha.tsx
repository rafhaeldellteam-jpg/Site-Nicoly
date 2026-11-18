"use client";

import { useState } from "react";

/** Força da senha de 0 a 4 (só para orientar; o Supabase exige no mínimo 6 caracteres). */
export function forcaSenha(s: string): number {
  if (s.length < 6) return s.length ? 1 : 0;
  let pts = 1;
  if (s.length >= 10) pts++;
  if (/[A-Z]/.test(s) && /[a-z]/.test(s)) pts++;
  if (/\d/.test(s) && /[^A-Za-z0-9]/.test(s)) pts++;
  else if (/\d/.test(s) || /[^A-Za-z0-9]/.test(s)) pts += 0.5;
  return Math.min(4, Math.floor(pts));
}

const ROTULOS = ["", "Fraca", "Razoável", "Boa", "Forte"];

/**
 * Campo de senha com botão de mostrar/ocultar, aviso de Caps Lock
 * e (opcional) medidor de força para quem está criando a senha.
 */
export default function CampoSenha({
  id,
  name,
  valor,
  aoMudar,
  rotulo = "Senha",
  novaSenha = false,
  mostrarForca = false,
  placeholder = "Mínimo 6 caracteres",
}: {
  id: string;
  name?: string;
  valor?: string;
  aoMudar?: (v: string) => void;
  rotulo?: string;
  novaSenha?: boolean;
  mostrarForca?: boolean;
  placeholder?: string;
}) {
  const [visivel, setVisivel] = useState(false);
  const [caps, setCaps] = useState(false);
  const [interno, setInterno] = useState("");
  const atual = valor ?? interno;
  const forca = forcaSenha(atual);

  return (
    <div className="form-group">
      <label htmlFor={id}>{rotulo} *</label>
      <div className="campo-senha">
        <input
          id={id}
          name={name}
          className="input-lux"
          type={visivel ? "text" : "password"}
          required
          minLength={6}
          placeholder={placeholder}
          autoComplete={novaSenha ? "new-password" : "current-password"}
          value={atual}
          onChange={(e) => (aoMudar ? aoMudar(e.target.value) : setInterno(e.target.value))}
          onKeyUp={(e) => setCaps(e.getModifierState?.("CapsLock") ?? false)}
          onBlur={() => setCaps(false)}
        />
        <button
          type="button"
          className="campo-senha-olho"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
        >
          {visivel ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
              <path d="M9.9 4.2A9.8 9.8 0 0 1 12 4c5 0 9 4.5 10 8-.4 1.3-1.2 2.7-2.3 4M6.1 6.1C4.2 7.4 2.7 9.5 2 12c1 3.5 5 8 10 8 1.7 0 3.3-.5 4.7-1.3" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M2 12c1-3.5 5-8 10-8s9 4.5 10 8c-1 3.5-5 8-10 8S3 15.5 2 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {caps && <p className="campo-senha-aviso">Caps Lock está ligado</p>}
      {mostrarForca && atual.length > 0 && (
        <div className="campo-senha-forca" data-forca={forca} aria-live="polite">
          <span>
            {[1, 2, 3, 4].map((n) => (
              <i key={n} className={n <= forca ? "on" : ""} />
            ))}
          </span>
          <small>{atual.length < 6 ? "Mínimo 6 caracteres" : `Senha ${ROTULOS[forca].toLowerCase()}`}</small>
        </div>
      )}
    </div>
  );
}
