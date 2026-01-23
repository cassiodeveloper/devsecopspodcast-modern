const DEFAULT_LANG = "pt";

function applyLang(lang) {
  const dict = I18N[lang] || I18N[DEFAULT_LANG];

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!dict[key]) return;

    // suporta HTML (ex: <br>)
    el.innerHTML = dict[key];
  });

  document.documentElement.setAttribute("lang", lang);
  localStorage.setItem("lang", lang);

  const toggle = document.getElementById("langToggle");
  if (toggle) toggle.textContent = lang === "pt" ? "EN" : "PT";
}

function initLangToggle() {
  const saved = localStorage.getItem("lang") || DEFAULT_LANG;
  applyLang(saved);

  const btn = document.getElementById("langToggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("lang") || DEFAULT_LANG;
    const next = current === "pt" ? "en" : "pt";
    applyLang(next);
  });
}

document.addEventListener("DOMContentLoaded", initLangToggle);
