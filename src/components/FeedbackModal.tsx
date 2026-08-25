"use client";

import { useEffect, useRef, useState } from "react";
import { IconCamera } from "@/components/icons";

const ESTRELA_PATH =
  "M12 2l2.4 7.2L22 10l-7.6 3.6L17 22l-5-3.8L7 22l2.6-8.4L2 10l7.6-.8z";

export default function FeedbackModal() {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [instagram, setInstagram] = useState("");
  const [estrelas, setEstrelas] = useState(0);
  const [comentario, setComentario] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const inputArq = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const abrir = () => setAberto(true);
    window.addEventListener("abrir-feedback", abrir);
    return () => window.removeEventListener("abrir-feedback", abrir);
  }, []);

  if (!aberto) return null;

  function addFotos(lista: FileList | null) {
    if (!lista) return;
    const novas = Array.from(lista).filter((f) => f.type.startsWith("image/"));
    setFotos((atual) => [...atual, ...novas].slice(0, 5));
  }

  async function enviar() {
    if (estrelas < 1 || nome.trim().length < 2) return;
    setEnviando(true);
    setMsg(null);
    const { uploadFeedbackPhoto, createFeedback } = await import("@/lib/actions");

    const urls: string[] = [];
    for (const foto of fotos) {
      const r = await uploadFeedbackPhoto(foto);
      if (r.url) urls.push(r.url);
    }

    const r = await createFeedback({
      nome,
      instagram,
      estrelas,
      comentario,
      fotosUrls: urls,
    });
    setEnviando(false);
    if (!r.ok) {
      setMsg({ tipo: "erro", texto: r.erro ?? "Erro ao enviar." });
      return;
    }
    setMsg({
      tipo: "ok",
      texto: "Avaliação enviada! Ela aparecerá no site após aprovação.",
    });
    setTimeout(() => {
      setAberto(false);
      setNome("");
      setInstagram("");
      setEstrelas(0);
      setComentario("");
      setFotos([]);
      setMsg(null);
    }, 2600);
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setAberto(false)}>
      <div className="modal-container">
        <button className="modal-close" onClick={() => setAberto(false)} aria-label="Fechar">
          &times;
        </button>
        <div className="p-8 md:p-10">
          <h3 className="font-heading text-3xl text-(--rose-gold) text-center mb-6">
            Deixe sua avaliação
          </h3>

          <div className="form-group">
            <label>Seu nome *</label>
            <input
              className="input-lux"
              placeholder="Ex: Ana Silva"
              maxLength={60}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>@ do Instagram</label>
            <input
              className="input-lux"
              placeholder="@seuinstagram"
              maxLength={40}
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Avaliação *</label>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  className={v <= estrelas ? "on" : ""}
                  onClick={() => setEstrelas(v)}
                  aria-label={`${v} estrelas`}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill={v <= estrelas ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                    <path d={ESTRELA_PATH} />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Comentário</label>
            <textarea
              className="input-lux resize-none"
              rows={3}
              placeholder="Conte-nos sua experiência..."
              maxLength={500}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Fotos (opcional, até 5)</label>
            <input
              ref={inputArq}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => addFotos(e.target.files)}
            />
            <button
              type="button"
              className="btn btn-outline py-2.5! px-5! text-[0.85rem]! inline-flex items-center gap-2"
              onClick={() => inputArq.current?.click()}
            >
              <IconCamera size={15} /> Escolher fotos
            </button>
            {fotos.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {fotos.map((f, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={URL.createObjectURL(f)}
                    alt={`Foto ${i + 1}`}
                    className="w-14 h-14 object-cover rounded-lg border border-(--border-color-strong)"
                  />
                ))}
              </div>
            )}
          </div>

          {msg && (
            <p className={`text-sm mb-4 text-center ${msg.tipo === "ok" ? "text-green-400" : "text-[#ef5350]"}`}>
              {msg.texto}
            </p>
          )}

          <button
            className="btn btn-primary btn-block"
            disabled={enviando || estrelas < 1 || nome.trim().length < 2}
            onClick={enviar}
          >
            {enviando ? "Enviando..." : "Enviar Avaliação"}
          </button>
        </div>
      </div>
    </div>
  );
}
