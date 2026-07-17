const state = {
  all: [],
  filtered: [],
  page: 0,
  pageSize: 10,
  loading: false,
  latest: null
};

const elList = document.querySelector("#list");
const elStatus = document.querySelector("#status");
const elSentinel = document.querySelector("#sentinel");
const elQ = document.querySelector("#q");
const elSeason = document.querySelector("#season");
const elYear = document.querySelector("#year");
const elRssLink = document.querySelector("#rssLink");
const elYtChannel = document.querySelector("#ytChannel");
const elLastMeta = document.querySelector("#lastMeta");
const elLastTitle = document.querySelector("#lastTitle");
const elLastDetails = document.querySelector("#lastDetails");
const elLastYoutube = document.querySelector("#lastYoutube");
const elLastDownload = document.querySelector("#lastDownload");
const elLastAudio = document.querySelector("#lastAudio");

elYear.textContent = String(new Date().getFullYear());

function ui(key, variables = {}) {
  return window.translate ? window.translate(key, variables) : key;
}

function currentLocale() {
  return window.getCurrentLang?.() === "en" ? "en-GB" : "pt-BR";
}

function setStatus(msg="") {
  elStatus.textContent = msg;
}

function escapeHtml(s="") {
  return s.replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[c]));
}

function seasonFromTitle(title="") {
  const m = title.match(/T(\d+)\b/i) || title.match(/S(\d+)\b/i);
  return m ? m[1].padStart(2,"0") : "";
}

function buildSeasonOptions(episodes) {
  const seasons = new Set(episodes.map(e => seasonFromTitle(e.title)).filter(Boolean));
  [...seasons].sort((a,b)=>Number(b)-Number(a)).forEach(s=>{
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = `T${s}`;
    elSeason.appendChild(opt);
  });
}

function renderLatestEpisode() {
  const episode = state.latest;
  if (!episode) return;

  const meta = [];
  if (episode.date) meta.push(new Date(episode.date).toLocaleDateString(currentLocale()));
  if (episode.author) meta.push(episode.author);

  elLastMeta.removeAttribute("data-i18n");
  elLastTitle.removeAttribute("data-i18n");
  elLastMeta.textContent = meta.join(" • ");
  elLastTitle.textContent = episode.title || "";
  elLastDetails.href = `episode.html?slug=${encodeURIComponent(episode.slug)}`;

  elLastYoutube.style.display = episode.youtube ? "inline-flex" : "none";
  if (episode.youtube) elLastYoutube.href = episode.youtube;

  elLastDownload.style.display = episode.download ? "inline-flex" : "none";
  if (episode.download) elLastDownload.href = episode.download;

  if (episode.mp3) elLastAudio.src = episode.mp3;
}

function applyFilters() {
  const q = (elQ.value || "").trim().toLowerCase();
  const s = elSeason.value;

  state.filtered = state.all.filter(ep => {
    const hay = [
      ep.title, ep.author, (ep.excerpt||""), (ep.tags||[]).join(" ")
    ].join(" ").toLowerCase();

    const okQ = !q || hay.includes(q);
    const okS = !s || seasonFromTitle(ep.title) === s;
    return okQ && okS;
  });

  // reset paging
  state.page = 0;
  elList.innerHTML = "";
  renderNextPage(true);
}

function renderEpisodeItem(ep) {
  const safeTitle = escapeHtml(ep.title);
  const safeExcerpt = escapeHtml(ep.excerpt || "");
  const parts = [];
  if (ep.code) parts.push(`<strong>${escapeHtml(ep.code)}</strong>`);
  if (ep.date) parts.push(new Date(ep.date).toLocaleDateString(currentLocale()));
  if (ep.author) parts.push(escapeHtml(ep.author));

  const meta = parts.join(" • ");


  const div = document.createElement("article");
  div.className = "item";
  div.innerHTML = `
    <div class="item-top">
      <div>
        <div class="kicker">${meta}</div>
        <a class="title" href="episode.html?slug=${encodeURIComponent(ep.slug)}">${safeTitle}</a>
      </div>
      <div class="kicker">${(ep.tags||[]).slice(0,3).map(t=>`#${escapeHtml(t)}`).join(" ")}</div>
    </div>

    <p class="excerpt">${safeExcerpt}</p>

    <div class="row">
      <audio class="audio" controls preload="none" src="${ep.mp3}"></audio>
      <div class="links">
        <a class="pill" href="episode.html?slug=${encodeURIComponent(ep.slug)}">${escapeHtml(ui("actions.details"))}</a>
        ${ep.download ? `
          <a class="pill" href="${ep.download}" download>
            ${escapeHtml(ui("actions.downloadAudio"))}
          </a>` : ""
        }
        ${ep.youtube && ep.youtube.trim() ? `
          <a class="pill" href="${ep.youtube}" target="_blank" rel="noreferrer">
            YouTube
          </a>` : ""
        }
      </div>
    </div>
  `;
  return div;
}

function renderNextPage(fromReset=false) {
  if (state.loading) return;
  state.loading = true;

  const start = state.page * state.pageSize;
  const end = start + state.pageSize;
  const slice = state.filtered.slice(start, end);

  if (fromReset && state.filtered.length === 0) {
    setStatus(ui("status.noResults"));
    state.loading = false;
    return;
  }

  if (slice.length === 0) {
    setStatus(ui("status.end"));
    state.loading = false;
    return;
  }

  const frag = document.createDocumentFragment();
  slice.forEach(ep => frag.appendChild(renderEpisodeItem(ep)));
  elList.appendChild(frag);

  state.page += 1;
  setStatus(ui("status.showing", {
    shown: Math.min(end, state.filtered.length),
    total: state.filtered.length
  }));
  state.loading = false;
}

async function init() {
  setStatus(ui("status.loadingEpisodes"));

  const res = await fetch("data/episodes.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao carregar episodes.json");

  const data = await res.json();

  if (data?.meta?.rss) elRssLink.href = data.meta.rss;
  if (data?.meta?.youtubeChannel) elYtChannel.href = data.meta.youtubeChannel;

  state.all = (data.episodes || [])
    .slice()
    .sort((a,b)=> (b.date || "").localeCompare(a.date || ""));
  state.latest = state.all[0] || null;
  renderLatestEpisode();


  buildSeasonOptions(state.all);

  state.filtered = state.all;
  elList.innerHTML = "";
  state.page = 0;
  renderNextPage(true);

  const io = new IntersectionObserver((entries) => {
    if (entries.some(e => e.isIntersecting)) renderNextPage();
  }, { rootMargin: "600px" });

  io.observe(elSentinel);

  elQ.addEventListener("input", debounce(applyFilters, 150));
  elSeason.addEventListener("change", applyFilters);
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

document.addEventListener("languagechange", () => {
  if (state.latest) renderLatestEpisode();

  if (state.all.length) {
    applyFilters();
  } else {
    setStatus(ui("status.loadingEpisodes"));
  }
});

init().catch(err => {
  console.error(err);
  setStatus(ui("status.loadError"));
});
