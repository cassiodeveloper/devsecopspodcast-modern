const DEFAULT_LANG = "pt";

function applyLang(lang) {
  const selectedLang = I18N[lang] ? lang : DEFAULT_LANG;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    el.innerHTML = translate(key, {}, selectedLang);
  });

  const translatedAttributes = {
    "data-i18n-placeholder": "placeholder",
    "data-i18n-title": "title",
    "data-i18n-content": "content",
    "data-i18n-aria-label": "aria-label"
  };

  Object.entries(translatedAttributes).forEach(([dataAttribute, htmlAttribute]) => {
    document.querySelectorAll(`[${dataAttribute}]`).forEach((el) => {
      el.setAttribute(htmlAttribute, translate(el.getAttribute(dataAttribute), {}, selectedLang));
    });
  });

  document.documentElement.setAttribute("lang", selectedLang);
  localStorage.setItem("lang", selectedLang);

  const toggle = document.getElementById("langToggle");
  if (toggle) toggle.textContent = selectedLang === "pt" ? "EN" : "PT";

  document.dispatchEvent(new CustomEvent("languagechange", {
    detail: { lang: selectedLang }
  }));
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
