const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const siteUrl = "https://devsecopspodcast.com.br";
const data = JSON.parse(fs.readFileSync(path.join(root, "data", "episodes.json"), "utf8"));
const episodes = Array.isArray(data.episodes) ? data.episodes : [];

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;"
    }[character];
  });
}

function entry(location, lastModified, priority) {
  return [
    "  <url>",
    "    <loc>" + escapeXml(location) + "</loc>",
    lastModified ? "    <lastmod>" + escapeXml(lastModified) + "</lastmod>" : "",
    "    <priority>" + priority + "</priority>",
    "  </url>"
  ].filter(Boolean).join("\n");
}

const newestDate = episodes
  .map(function (episode) { return episode.date || ""; })
  .filter(Boolean)
  .sort()
  .at(-1);

const urls = [entry(siteUrl + "/", newestDate, "1.00")];

for (const episode of episodes) {
  if (!episode.slug) continue;

  urls.push(entry(
    siteUrl + "/episode.html?slug=" + encodeURIComponent(episode.slug),
    episode.date,
    "0.80"
  ));

  if (typeof episode.blogPostUrl === "string" && episode.blogPostUrl.trim()) {
    urls.push(entry(
      new URL(episode.blogPostUrl, siteUrl + "/").href,
      episode.date,
      "0.90"
    ));
  }
}

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls,
  "</urlset>",
  ""
].join("\n");

fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap, "utf8");
console.log("Sitemap gerado com " + urls.length + " URLs.");
