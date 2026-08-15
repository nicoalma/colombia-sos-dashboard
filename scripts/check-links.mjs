// Deterministic link checker: probes every http(s) link in the feed and writes
// link-report.json. The report is evidence for the AI refresh step — this
// script never mutates the feed itself.
import { readFileSync, writeFileSync } from "node:fs";

const feed = JSON.parse(readFileSync("data/initiatives.json", "utf8"));
const urls = [...new Set(
  feed.initiatives.flatMap((i) => i.links.map((l) => l.url)).filter((u) => /^https?:\/\//.test(u))
)];

async function probe(url) {
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
        headers: { "user-agent": "Mozilla/5.0 (compatible; ColombiaSOS-linkcheck/1.0)" },
      });
      // Some servers reject HEAD; retry those with GET before concluding anything.
      if (method === "HEAD" && res.status >= 400) continue;
      return { ok: res.status < 400, status: res.status };
    } catch (e) {
      if (method === "GET") return { ok: false, status: 0, error: e.name };
    }
  }
  return { ok: false, status: 0 };
}

const report = {};
for (const url of urls) {
  report[url] = await probe(url);
  console.log(`${report[url].ok ? "✅" : "⚠️ "} ${report[url].status || "ERR"} ${url}`);
}

writeFileSync("link-report.json", JSON.stringify(report, null, 2));
console.log(`\nReporte: ${urls.length} links → link-report.json`);
