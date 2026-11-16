/**
 * Estrae nel browser `n` fotogrammi distribuiti lungo il video (elemento <video> + <canvas>).
 * Ogni fotogramma è un JPEG (qualità 0.7) in data URL, con il lato lungo ridotto a `lato` px:
 * così il corpo della richiesta ad /api/ai/analizza resta sotto il limite di 6 MB.
 */
export async function estraiFotogrammi(file: File, n = 6, lato = 768): Promise<string[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await attendi(video, "loadedmetadata", 15000);
    // Alcuni browser mobili danno durata infinita finché non si cerca in fondo al file.
    if (!Number.isFinite(video.duration)) {
      video.currentTime = 1e6;
      await attendi(video, "seeked", 8000).catch(() => undefined);
    }
    const durata = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    const w0 = video.videoWidth;
    const h0 = video.videoHeight;
    if (!w0 || !h0) throw new Error("video_non_leggibile");
    const k = Math.min(1, lato / Math.max(w0, h0));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w0 * k);
    canvas.height = Math.round(h0 * k);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas_non_disponibile");

    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      // Al centro di n fette uguali: evita il nero del primo e dell'ultimo fotogramma.
      const t = durata ? (durata * (i + 0.5)) / n : 0;
      if (Math.abs(video.currentTime - t) > 0.01) {
        video.currentTime = t;
        await attendi(video, "seeked", 8000);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      out.push(canvas.toDataURL("image/jpeg", 0.7));
    }
    return out;
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
    video.load();
  }
}

function attendi(el: HTMLVideoElement, evento: string, ms: number): Promise<void> {
  return new Promise((ok, no) => {
    const fine = setTimeout(() => { pulisci(); no(new Error("timeout_video")); }, ms);
    const su = () => { pulisci(); ok(); };
    const err = () => { pulisci(); no(new Error("video_non_leggibile")); };
    const pulisci = () => {
      clearTimeout(fine);
      el.removeEventListener(evento, su);
      el.removeEventListener("error", err);
    };
    el.addEventListener(evento, su, { once: true });
    el.addEventListener("error", err, { once: true });
  });
}
