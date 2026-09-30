const SITES = {
  webview: {
    origin: "https://www.novinky.cz",
    hosts: ["www.novinky.cz", "novinky.cz"],
    base: "/webview/",
    stripScripts: true,
    error: "Novinky webview is unavailable.",
  },
  guardian: {
    origin: "https://www.theguardian.com",
    hosts: ["www.theguardian.com", "theguardian.com"],
    base: "/guardian/",
    stripScripts: true,
    error: "Guardian webview is unavailable.",
  },
  bbc: {
    origin: "https://www.bbc.com",
    hosts: ["www.bbc.com", "bbc.com", "www.bbc.co.uk", "bbc.co.uk"],
    base: "/bbc/",
    stripScripts: true,
    error: "BBC webview is unavailable.",
  },
};

const UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36";

const DROP_HEADERS = new Set([
  "transfer-encoding",
  "content-encoding",
  "content-length",
  "connection",
  "keep-alive",
  "set-cookie",
  "content-security-policy",
  "x-frame-options",
  "cross-origin-resource-policy",
  "cross-origin-embedder-policy",
  "cross-origin-opener-policy",
  "origin-agent-cluster",
]);

function restPath(req) {
  const p = req.query && req.query.path;
  if (Array.isArray(p)) return "/" + p.filter(Boolean).join("/");
  if (typeof p === "string" && p) return "/" + p.replace(/^\/+/, "");
  return "/";
}

function rewriteSiteUrl(text, site) {
  const dest = site.base.replace(/\/$/, "");
  for (const host of site.hosts) {
    for (const scheme of ["https://", "http://", "//"]) {
      text = text.split(scheme + host).join(dest);
    }
  }
  return text;
}

function injectWebviewBase(html, base) {
  if (/<base\s/i.test(html)) return html;
  return html.replace(/(<head[^>]*>)/i, `$1<base href="${base}">`);
}

function freezeSiteSsr(html, site) {
  if (site.stripScripts) {
    html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  }
  html = rewriteSiteUrl(html, site);
  html = html.replace(/"\/\//g, '"https://').replace(/'\/\//g, "'https://");
  html = html.replace(/url\(\/\//g, "url(https://");
  html = html.replace(/([\s,])\/\/(?=[a-z0-9])/g, "$1https://");
  return html;
}

async function handleProxy(req, res, siteKey) {
  const site = SITES[siteKey];
  if (!site) {
    res.statusCode = 404;
    res.end("Unknown site");
    return;
  }

  let rest = restPath(req);
  if (!rest.startsWith("/")) rest = "/" + rest;
  const search = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const target = site.origin + rest + search;

  try {
    const upstream = await fetch(target, {
      redirect: "manual",
      headers: {
        "User-Agent": UA,
        Accept: req.headers.accept || "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": req.headers["accept-language"] || "cs,en;q=0.8",
        "Accept-Encoding": "identity",
      },
    });

    const rawBuf = Buffer.from(await upstream.arrayBuffer());
    let headers = {};
    upstream.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const location = headers.location || headers.Location;
    if (location) headers.location = rewriteSiteUrl(location, site);

    let body = rawBuf;
    const ctype = headers["content-type"] || "";
    if (ctype.includes("text/html")) {
      let charset = "utf-8";
      const match = /charset=([\w-]+)/i.exec(ctype);
      if (match) charset = match[1];
      let text = body.toString(charset);
      text = injectWebviewBase(text, site.base);
      text = freezeSiteSsr(text, site);
      body = Buffer.from(text, "utf-8");
      headers["content-type"] = "text/html; charset=utf-8";
    }

    res.statusCode = upstream.status;
    for (const [key, value] of Object.entries(headers)) {
      if (DROP_HEADERS.has(key.toLowerCase())) continue;
      res.setHeader(key, value);
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Length", String(body.length));
    res.end(body);
  } catch (err) {
    const body = Buffer.from(site.error, "utf-8");
    res.statusCode = 502;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Length", String(body.length));
    res.end(body);
  }
}

module.exports = { handleProxy, SITES };
