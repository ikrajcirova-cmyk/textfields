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

function rewriteLocation(location, site) {
  if (!location) return location;
  if (/^https?:\/\//i.test(location) || location.startsWith("//")) {
    return rewriteSiteUrl(location, site);
  }
  if (location.startsWith("/")) {
    return site.base.replace(/\/$/, "") + location;
  }
  return location;
}

function injectWebviewBase(html, base) {
  if (/<base\s/i.test(html)) return html;
  return html.replace(/(<head[^>]*>)/i, `$1<base href="${base}">`);
}

function injectScrollBridge(html) {
  const snippet = `<style id="addr-scroll-unlock">html,body{height:auto!important;max-height:none!important;overflow:auto!important;}</style>
<script>
(function(){
  function unlock(){
    var roots=[document.documentElement,document.body];
    for(var i=0;i<roots.length;i++){
      if(!roots[i]) continue;
      roots[i].style.setProperty("overflow","auto","important");
      roots[i].style.setProperty("height","auto","important");
      roots[i].style.setProperty("max-height","none","important");
    }
    var nodes=document.querySelectorAll("body *");
    for(var i=0;i<nodes.length;i++){
      var el=nodes[i];
      var st=window.getComputedStyle(el);
      if((st.overflowY==="hidden"||st.overflow==="hidden")&&el.scrollHeight>el.clientHeight+20){
        el.style.setProperty("overflow","auto","important");
      }
    }
  }
  function y(){
    var t=window.scrollY||0;
    var se=document.scrollingElement||document.documentElement;
    if(se) t=Math.max(t,se.scrollTop||0);
    if(document.body) t=Math.max(t,document.body.scrollTop||0);
    var nodes=document.querySelectorAll("body *");
    for(var i=0;i<nodes.length;i++){
      var el=nodes[i];
      if(el.scrollTop>t&&el.scrollHeight>el.clientHeight+8) t=el.scrollTop;
    }
    return t;
  }
  function send(n){ try{ parent.postMessage({type:"addr-scroll",y:n==null?y():n},"*"); }catch(e){} }
  unlock();
  window.addEventListener("scroll",function(){ send(); },{passive:true,capture:true});
  document.addEventListener("scroll",function(){ send(); },{passive:true,capture:true});
  document.addEventListener("wheel",function(e){ send(e.deltaY>0?Math.max(1,y()):y()); },{passive:true});
  document.addEventListener("touchstart",function(e){ window.__addrTY=e.touches&&e.touches[0]?e.touches[0].clientY:0; },{passive:true});
  document.addEventListener("touchmove",function(e){
    var cy=e.touches&&e.touches[0]?e.touches[0].clientY:0;
    send((window.__addrTY-cy)>1?Math.max(1,y()):y());
    window.__addrTY=cy;
  },{passive:true});
  send();
})();
</script>`;
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, snippet + "</body>");
  return html + snippet;
}

function freezeSiteSsr(html, site) {
  if (site.stripScripts) {
    html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  }
  html = rewriteSiteUrl(html, site);
  html = html.replace(/"\/\//g, '"https://').replace(/'\/\//g, "'https://");
  html = html.replace(/url\(\/\//g, "url(https://");
  html = html.replace(/([\s,])\/\/(?=[a-z0-9])/g, "$1https://");
  return injectScrollBridge(html);
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
  let target = site.origin + rest + search;

  try {
    let upstream;
    for (let hop = 0; hop < 5; hop += 1) {
      upstream = await fetch(target, {
        redirect: "manual",
        headers: {
          "User-Agent": UA,
          Accept: req.headers.accept || "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "Accept-Language": req.headers["accept-language"] || "cs,en;q=0.8",
          "Accept-Encoding": "identity",
        },
      });
      const loc = upstream.headers.get("location");
      if (![301, 302, 303, 307, 308].includes(upstream.status) || !loc) break;
      if (loc.startsWith("/") && !loc.startsWith("//")) {
        target = site.origin + loc;
      } else if (loc.startsWith("//")) {
        target = "https:" + loc;
      } else {
        target = loc;
      }
    }

    const rawBuf = Buffer.from(await upstream.arrayBuffer());
    let headers = {};
    upstream.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const location = headers.location || headers.Location;
    if (location) headers.location = rewriteLocation(location, site);

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
