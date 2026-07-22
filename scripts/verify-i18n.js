const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const i18nSource = fs.readFileSync(path.join(root, "assets", "i18n.js"), "utf8");
const langSource = fs.readFileSync(path.join(root, "assets", "lang.js"), "utf8");
const context = {
  window: {},
  document: {
    documentElement: {
      getAttribute: function () { return "pt"; }
    }
  }
};

vm.createContext(context);
vm.runInContext(i18nSource + "\nwindow.__I18N_EXPORT = I18N;", context);

const dictionaries = context.window.__I18N_EXPORT;
const languages = Object.keys(dictionaries);
const errors = [];
const referenceKeys = new Set();
const sourceFiles = [
  "index.html",
  "episode.html",
  "assets/app.js",
  "assets/episode.js",
  "posts/t8e07-from-conflict-to-collaboration.html"
];

function collectMatches(source, pattern) {
  for (const match of source.matchAll(pattern)) {
    referenceKeys.add(match[1]);
  }
}

for (const relativePath of sourceFiles) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  collectMatches(source, /data-i18n(?:-(?:placeholder|title|content|aria-label))?="([^"]+)"/g);
  collectMatches(source, /\b(?:ui|translate)\("([^"]+)"/g);
}

for (const lang of languages) {
  for (const key of referenceKeys) {
    if (!Object.prototype.hasOwnProperty.call(dictionaries[lang], key)) {
      errors.push(lang + ": chave ausente " + key + ".");
    }
  }
}

const baseline = new Set(Object.keys(dictionaries.pt || {}));
for (const lang of languages.filter(function (value) { return value !== "pt"; })) {
  const keys = new Set(Object.keys(dictionaries[lang]));
  for (const key of baseline) {
    if (!keys.has(key)) errors.push(lang + ": chave presente apenas em pt: " + key + ".");
  }
  for (const key of keys) {
    if (!baseline.has(key)) errors.push(lang + ": chave sem equivalente em pt: " + key + ".");
  }
}


const elements = {
  content: {
    attributes: { "data-i18n": "episodes.title" },
    innerHTML: "",
    getAttribute: function (name) { return this.attributes[name]; },
    setAttribute: function (name, value) { this.attributes[name] = value; }
  },
  placeholder: {
    attributes: { "data-i18n-placeholder": "filters.searchPlaceholder" },
    getAttribute: function (name) { return this.attributes[name]; },
    setAttribute: function (name, value) { this.attributes[name] = value; }
  },
  title: {
    attributes: { "data-i18n-title": "filters.seasonTitle" },
    getAttribute: function (name) { return this.attributes[name]; },
    setAttribute: function (name, value) { this.attributes[name] = value; }
  },
  contentAttribute: {
    attributes: { "data-i18n-content": "post.t8e07.description" },
    getAttribute: function (name) { return this.attributes[name]; },
    setAttribute: function (name, value) { this.attributes[name] = value; }
  },
  aria: {
    attributes: { "data-i18n-aria-label": "language.toggle" },
    getAttribute: function (name) { return this.attributes[name]; },
    setAttribute: function (name, value) { this.attributes[name] = value; }
  },
  toggle: { textContent: "" }
};

let activeLang = "pt";
let languageEvent = null;
const toggleContext = {
  window: {},
  localStorage: { setItem: function () {} },
  CustomEvent: function (type, options) {
    this.type = type;
    this.detail = options.detail;
  },
  document: {
    documentElement: {
      getAttribute: function () { return activeLang; },
      setAttribute: function (_, value) { activeLang = value; }
    },
    querySelectorAll: function (selector) {
      return {
        "[data-i18n]": [elements.content],
        "[data-i18n-placeholder]": [elements.placeholder],
        "[data-i18n-title]": [elements.title],
        "[data-i18n-content]": [elements.contentAttribute],
        "[data-i18n-aria-label]": [elements.aria]
      }[selector] || [];
    },
    getElementById: function (id) { return id === "langToggle" ? elements.toggle : null; },
    addEventListener: function () {},
    dispatchEvent: function (event) { languageEvent = event; }
  }
};

vm.createContext(toggleContext);
vm.runInContext(
  i18nSource + "\n" + langSource +
  "\napplyLang('en');" +
  "\nwindow.__sample = translate('status.showing', { shown: 10, total: 20 });",
  toggleContext
);

const toggleAssertions = [
  [activeLang === "en", "O idioma do documento nao mudou para en."],
  [elements.content.innerHTML === "Episodes", "O texto visivel nao foi traduzido."],
  [elements.placeholder.attributes.placeholder === "Search (title, guest, tags)…", "O placeholder nao foi traduzido."],
  [elements.title.attributes.title === "Season", "O atributo title nao foi traduzido."],
  [elements.contentAttribute.attributes.content === "Learn how development and security teams can move from conflict to cooperation through communication, leadership, training, and automation.", "O atributo content nao foi traduzido."],
  [elements.aria.attributes["aria-label"] === "Switch language", "O aria-label nao foi traduzido."],
  [elements.toggle.textContent === "PT", "O rotulo do toggle nao foi invertido."],
  [languageEvent?.detail?.lang === "en", "O evento languagechange nao foi disparado."],
  [toggleContext.window.__sample === "Showing 10 of 20", "As variaveis da traducao nao foram interpoladas."]
];

for (const assertion of toggleAssertions) {
  if (!assertion[0]) errors.push(assertion[1]);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(referenceKeys.size + " chaves de interface validadas em " + languages.join("/") + ".");
}
