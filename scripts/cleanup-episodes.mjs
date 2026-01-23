import fs from "node:fs/promises";

const FILE = new URL("../data/episodes.json", import.meta.url);

function stripSupporter(html = "") {
  // remove trecho "Become a supporter..." até o final, mantendo o conteúdo principal
  const marker = "Become a supporter of this podcast:";
  const idx = html.indexOf(marker);
  if (idx >= 0) html = html.slice(0, idx);

  // remove também variações comuns
  html = html.replace(/Become a supporter of this podcast:[\s\S]*$/i, "");

  // limpa excesso de <br>
  html = html.replace(/(<br\s*\/?>\s*){3,}/gi, "<br /><br />").trim();
  return html;
}

function cleanExcerpt(text = "", max = 220) {
  let t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;

  // corta no último espaço antes do limite
  t = t.slice(0, max);
  const cut = t.lastIndexOf(" ");
  if (cut > 120) t = t.slice(0, cut);
  return t + "…";
}

function extractSpreakerEpisodeId(ep) {
  // tenta capturar de URLs do tipo: .../download/episode/69505568/708.mp3
  const candidates = [ep.mp3, ep.download, ep.link].filter(Boolean).join(" ");
  const m1 = candidates.match(/\/episode\/(\d+)\//i);
  if (m1) return m1[1];

  // fallback: se tiver api.spreaker.com/v2/episodes/123/download.mp3
  const m2 = candidates.match(/\/v2\/episodes\/(\d+)\//i);
  if (m2) return m2[1];

  return "";
}

function detectCodeFromTitle(title = "") {
  // "#07 - 08 - ..." -> T07E08
  const m = title.match(/#\s*(\d{1,2})\s*-\s*(\d{1,2})\s*-/);
  if (!m) return "";
  const s = m[1].padStart(2, "0");
  const e = m[2].padStart(2, "0");
  return `T${s}E${e}`;
}

function normalizeTitle(title = "") {
  // opcional: troca "#07 - 08 - " por "T07E08 - "
  const code = detectCodeFromTitle(title);
  if (!code) return title;
  return title.replace(/^\s*#\s*\d{1,2}\s*-\s*\d{1,2}\s*-\s*/i, `${code} - `).trim();
}

async function main() {
  const raw = await fs.readFile(FILE, "utf8");
  const data = JSON.parse(raw);

  data.episodes = (data.episodes || []).map((ep) => {
    const spreakerId = extractSpreakerEpisodeId(ep);

    // manter slug/id como está, mas guardar o numérico também
    if (spreakerId) ep.spreakerId = spreakerId;

    // forçar mp3/download “bonitos” do Spreaker API
    if (spreakerId) {
      const dl = `https://api.spreaker.com/v2/episodes/${spreakerId}/download.mp3`;
      ep.mp3 = dl;
      ep.download = dl;
    }

    // limpar conteúdo + excerpt
    ep.contentHtml = stripSupporter(ep.contentHtml || "");
    ep.excerpt = cleanExcerpt(ep.excerpt || ep.contentHtml?.replace(/<[^>]*>/g, " ") || "");

    // opcional: campo code + título normalizado
    ep.code = detectCodeFromTitle(ep.title || "");
    ep.title = normalizeTitle(ep.title || "");

    // tags garantidas
    if (!Array.isArray(ep.tags)) ep.tags = [];

    return ep;
  });

  await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8");
  console.log("OK: episodes.json limpo e padronizado.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
