// Node 18+
// Gera data/episodes.json a partir do RSS do Spreaker
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";
import slugify from "slugify";

const FEED = "https://www.spreaker.com/show/4179006/episodes/feed";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ajuste se seu projeto tiver outro layout
const OUT_PATH = path.join(__dirname, "..", "data", "episodes.json");

function toISODate(pubDate) {
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function cleanText(s = "") {
  return s
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickEnclosureUrl(item) {
  // RSS padrão usa <enclosure url="...mp3">
  const enc = item.enclosure;
  if (!enc) return "";
  if (typeof enc === "object" && enc["@_url"]) return String(enc["@_url"]).trim();
  return "";
}

function extractEpisodeIdFromSpreakerUrl(url) {
  // Ex: https://www.spreaker.com/episode/03-offensive-security--52461925
  const m = String(url || "").match(/--(\d+)\s*$/);
  return m ? m[1] : "";
}

function buildSlug(title) {
  // Mantém prefixos tipo "#07 - 08 - ..." legíveis
  const base = slugify(title, { lower: true, strict: true });

  // Normaliza variações tipo "#06-20" / "#06 - 20"
  return base
    .replace(/^0+/, "")
    .replace(/^(\d+)-(\d+)-/, "t$1e$2-") // se quiser forçar padrão T/E (opcional)
    .replace(/^-+/, "");
}

async function main() {
  console.log("Baixando RSS…", FEED);
  const xml = await fetch(FEED, {
    headers: { "User-Agent": "DevSecOpsPodcastSite/1.0 (+episodes.json generator)" }
  }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  });

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true
  });

  const feed = parser.parse(xml);
  const channel = feed?.rss?.channel;
  if (!channel) throw new Error("RSS inválido: rss.channel não encontrado.");

  const rawItems = channel.item ? (Array.isArray(channel.item) ? channel.item : [channel.item]) : [];
  console.log(`Itens no RSS: ${rawItems.length}`);

  const meta = {
    title: cleanText(channel.title || "DevSecOps Podcast"),
    rss: FEED,
    youtubeChannel: "" // preencha se quiser
  };

  const episodes = rawItems.map((it) => {
    const title = cleanText(it.title || "");
    const date = toISODate(it.pubDate || "");
    const descriptionHtml = it["content:encoded"] || it["content:Encoded"] || it.description || "";
    const excerpt = cleanText(it.description || it["itunes:summary"] || "").slice(0, 260);

    const siteUrl = cleanText(it.link || ""); // geralmente é a URL do episódio no Spreaker
    const enclosure = pickEnclosureUrl(it);

    const episodeId = extractEpisodeIdFromSpreakerUrl(siteUrl);
    const download = episodeId ? `https://api.spreaker.com/v2/episodes/${episodeId}/download.mp3` : enclosure;
    const mp3 = download;

    const slug = buildSlug(title || episodeId || "episodio");

    return {
      id: episodeId || slug,
      slug,
      title,
      date,
      author: cleanText(channel["itunes:author"] || "Cássio Batista Pereira"),
      excerpt,
      contentHtml: typeof descriptionHtml === "string" ? descriptionHtml : "",
      mp3,
      download,
      youtube: "",     // você preenche manualmente depois
      tags: []         // opcional
    };
  })
  // ordena do mais novo para o mais antigo (muda se preferir)
  .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const out = { meta, episodes };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(out, null, 2), "utf8");

  console.log(`OK: gerado ${OUT_PATH} com ${episodes.length} episódios.`);
  console.log("Dica: agora é só abrir seu site e pronto.");
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
