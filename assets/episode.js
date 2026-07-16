const el = document.querySelector("#ep");
document.querySelector("#year").textContent = String(new Date().getFullYear());

function escapeHtml(s="") {
  return s.replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[c]));
}

function safeHref(value="") {
  const candidate = String(value || "").trim();
  if (!candidate) return "";

  try {
    const url = new URL(candidate, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function getSlug() {
  const u = new URL(window.location.href);
  return u.searchParams.get("slug") || "";
}

async function load() {
  const slug = getSlug();
  if (!slug) {
    el.innerHTML = `<p class="muted">Slug ausente. Isso é literalmente um 404 emocional.</p>`;
    return;
  }

  const res = await fetch("data/episodes.json", { cache: "no-store" });
  const data = await res.json();

  const ep = (data.episodes || []).find(e => e.slug === slug);
  if (!ep) {
    el.innerHTML = `<p class="muted">Episódio não encontrado.</p>`;
    return;
  }

  const transcriptUrl = safeHref(ep.transcriptUrl);
  const blogPostUrl = safeHref(ep.blogPostUrl);
  const canonicalUrl = new URL(`episode.html?slug=${encodeURIComponent(ep.slug)}`, window.location.origin).href;

  const description = String(ep.excerpt || "").trim();
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", canonicalUrl);
  document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", ep.title);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
  document.querySelector('meta[property="og:url"]')?.setAttribute("content", canonicalUrl);
  document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", ep.title);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", description);

  document.title = `${ep.title} • DevSecOps Podcast`;

  const meta = `${ep.date ? new Date(ep.date).toLocaleDateString("pt-BR") : ""}${ep.author ? " • " + escapeHtml(ep.author) : ""}`;

  el.innerHTML = `
    <h1>${escapeHtml(ep.title)}</h1>
    <div class="meta">${meta}</div>

    <div class="row" style="margin-bottom:14px">
      <audio class="audio" controls preload="metadata" src="${ep.mp3}"></audio>
      <div class="links">
        ${ep.download ? `<a class="pill" href="${ep.download}" download>Baixar &aacute;udio</a>` : ""}
        ${ep.youtube ? `<a class="pill" href="${ep.youtube}" target="_blank" rel="noreferrer">YouTube</a>` : ""}
        ${transcriptUrl ? `<a class="pill pill-accent" href="${escapeHtml(transcriptUrl)}" download>Baixar transcript</a>` : ""}
        ${blogPostUrl ? `<a class="pill pill-accent" href="${escapeHtml(blogPostUrl)}">Ler artigo</a>` : ""}
      </div>
    </div>

    <div class="content">
      ${ep.contentHtml ? ep.contentHtml : `<p class="muted">${escapeHtml(ep.excerpt || "")}</p>`}
    </div>
  `;
}

load().catch(err => {
  console.error(err);
  el.innerHTML = `<p class="muted">Erro carregando episódio. Veja o console.</p>`;
});
