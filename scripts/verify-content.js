const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "episodes.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const episodes = Array.isArray(data.episodes) ? data.episodes : [];
const errors = [];
const slugs = new Set();

function validateLocalResource(ep, field, directory, extension) {
  const value = ep[field];
  if (value === undefined || value === null || value === "") return;

  if (typeof value !== "string") {
    errors.push((ep.slug || ep.id) + ": " + field + " precisa ser string ou null.");
    return;
  }

  const normalized = value.replace(/\\/g, "/");
  if (!normalized.startsWith(directory + "/") || normalized.includes("..")) {
    errors.push((ep.slug || ep.id) + ": " + field + " deve apontar para " + directory + "/ sem usar '..'.");
    return;
  }

  if (extension && path.extname(normalized).toLowerCase() !== extension) {
    errors.push((ep.slug || ep.id) + ": " + field + " deve usar um arquivo " + extension + ".");
  }

  if (!fs.existsSync(path.join(root, normalized))) {
    errors.push((ep.slug || ep.id) + ": arquivo nao encontrado em " + normalized + ".");
  }
}

for (const ep of episodes) {
  if (!ep.slug) {
    errors.push((ep.id || "episodio sem id") + ": slug ausente.");
  } else if (slugs.has(ep.slug)) {
    errors.push(ep.slug + ": slug duplicado.");
  } else {
    slugs.add(ep.slug);
  }

  validateLocalResource(ep, "transcriptUrl", "transcripts");
  validateLocalResource(ep, "blogPostUrl", "posts", ".html");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(episodes.length + " episodios validados; recursos locais estao consistentes.");
}
