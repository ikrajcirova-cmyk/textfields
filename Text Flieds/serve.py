#!/usr/bin/env python3
"""Serve the prototype on the LAN so a phone can open it."""
from __future__ import annotations

import gzip
import json
import re
import socket
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


PORT = 8765
HOST = "0.0.0.0"
WEBVIEW_SITES = (
    {
        "prefixes": ("/webview",),
        "origin": "https://www.novinky.cz",
        "hosts": ("www.novinky.cz", "novinky.cz"),
        "base": "/webview/",
        "strip_scripts": True,
        "error": "Novinky webview is unavailable.",
    },
    {
        "prefixes": ("/guardian",),
        "origin": "https://www.theguardian.com",
        "hosts": ("www.theguardian.com", "theguardian.com"),
        "base": "/guardian/",
        "strip_scripts": True,
        "error": "Guardian webview is unavailable.",
    },
    {
        "prefixes": ("/bbc",),
        "origin": "https://www.bbc.com",
        "hosts": ("www.bbc.com", "bbc.com", "www.bbc.co.uk", "bbc.co.uk"),
        "base": "/bbc/",
        "strip_scripts": True,
        "error": "BBC webview is unavailable.",
    },
)
WEBVIEW_UA = (
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
)
DROP_HEADERS = {
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
}


def lan_ips() -> list[str]:
    ips: list[str] = []

    def add(ip: str) -> None:
        if ip and ip not in ips and not ip.startswith("127."):
            ips.append(ip)

    try:
        probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        probe.connect(("8.8.8.8", 80))
        add(probe.getsockname()[0])
        probe.close()
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            add(info[4][0])
    except OSError:
        pass
    try:
        import subprocess

        for iface in ("en0", "en1"):
            try:
                out = subprocess.check_output(
                    ["ipconfig", "getifaddr", iface], text=True, timeout=2
                ).strip()
                add(out)
            except (subprocess.CalledProcessError, FileNotFoundError, OSError):
                pass
    except Exception:
        pass
    return ips


def lan_host() -> str:
    host = socket.gethostname().strip()
    if host and not host.endswith(".local"):
        host = f"{host}.local"
    return host


def lan_urls() -> list[str]:
    urls: list[str] = []
    host = lan_host()
    if host:
        urls.append(f"http://{host}:{PORT}/")
    for ip in lan_ips():
        url = f"http://{ip}:{PORT}/"
        if url not in urls:
            urls.append(url)
    return urls


def write_lan_js() -> None:
    payload = {
        "host": lan_host(),
        "port": PORT,
        "urls": lan_urls(),
    }
    body = "window.LAN = " + json.dumps(payload, indent=2) + ";\n"
    with open("lan.js", "w", encoding="utf-8") as f:
        f.write(body)


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json",
        ".svg": "image/svg+xml",
    }

    def log_message(self, fmt: str, *args) -> None:
        sys_stderr = __import__("sys").stderr
        sys_stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def end_headers(self) -> None:
        path = self.path.split("?", 1)[0]
        if path in ("/", "/index.html", "/textfields.html") or path.endswith(".html") or path.endswith(".js") or path.endswith(".css"):
            self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_GET(self) -> None:
        path, query = (self.path.split("?", 1) + [""])[:2]
        if path in ("/", "/index.html"):
            loc = "/textfields.html" + (("?" + query) if query else "")
            self.send_response(302)
            self.send_header("Location", loc)
            self.end_headers()
            return
        site, rest = match_webview_site(path)
        if site:
            self.proxy_webview(site, rest, query)
            return
        if path == "/__lan.json":
            payload = {
                "port": PORT,
                "host": lan_host(),
                "urls": lan_urls(),
                "hint": "Same Wi-Fi as this Mac. Keep this server running.",
            }
            body = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def proxy_webview(self, site: dict, rest: str, query: str) -> None:
        if not rest.startswith("/"):
            rest = "/" + rest
        target = site["origin"] + rest
        if query:
            target += "?" + query
        req = urllib.request.Request(
            target,
            headers={
                "User-Agent": WEBVIEW_UA,
                "Accept": self.headers.get("Accept", "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8"),
                "Accept-Language": self.headers.get("Accept-Language", "cs,en;q=0.8"),
                "Accept-Encoding": "identity",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                raw = resp.read()
                status = resp.status
                headers = {k: v for k, v in resp.headers.items()}
        except urllib.error.HTTPError as err:
            raw = err.read()
            status = err.code
            headers = {k: v for k, v in err.headers.items()} if err.headers else {}
        except Exception:
            body = site["error"].encode("utf-8")
            self.send_response(502)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        raw = maybe_decompress(raw, headers)
        ctype = headers.get("Content-Type", headers.get("content-type", ""))
        location = headers.get("Location", headers.get("location"))
        if location:
            headers["Location"] = rewrite_site_url(location, site)
        if "text/html" in ctype:
            charset = "utf-8"
            match = re.search(r"charset=([\w-]+)", ctype, re.I)
            if match:
                charset = match.group(1)
            text = raw.decode(charset, errors="replace")
            text = inject_webview_base(text, site["base"])
            text = freeze_site_ssr(text, site)
            raw = text.encode("utf-8")
            headers["Content-Type"] = "text/html; charset=utf-8"

        self.send_response(status)
        for key, value in headers.items():
            if key.lower() in DROP_HEADERS:
                continue
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


def maybe_decompress(raw: bytes, headers: dict[str, str]) -> bytes:
    enc = (headers.get("Content-Encoding") or headers.get("content-encoding") or "").lower()
    if enc == "gzip" or raw[:2] == b"\x1f\x8b":
        try:
            return gzip.decompress(raw)
        except OSError:
            return raw
    return raw


def match_webview_site(path: str):
    for site in WEBVIEW_SITES:
        for prefix in site["prefixes"]:
            if path == prefix or path.startswith(prefix + "/"):
                return site, path[len(prefix) :] or "/"
    return None, None


def rewrite_site_url(text: str, site: dict) -> str:
    dest = site["base"].rstrip("/")
    for host in site["hosts"]:
        for scheme in ("https://", "http://", "//"):
            text = text.replace(scheme + host, dest)
    return text


def inject_webview_base(html: str, base: str) -> str:
    if re.search(r"<base\s", html, re.I):
        return html
    return re.sub(r"(<head[^>]*>)", r"\1" + f'<base href="{base}">', html, count=1, flags=re.I)


def freeze_site_ssr(html: str, site: dict) -> str:
    """Keep server-rendered HTML. Site JS often breaks off the real origin."""
    if site.get("strip_scripts"):
        html = re.sub(r"<script\b[^>]*>.*?</script>", "", html, flags=re.I | re.S)
    html = rewrite_site_url(html, site)
    html = html.replace('"//', '"https://').replace("'//", "'https://")
    html = html.replace("url(//", "url(https://")
    html = re.sub(r"(?<=[\s,])//(?=[a-z0-9])", "https://", html)
    return html


if __name__ == "__main__":
    write_lan_js()
    urls = lan_urls()
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Serving on http://127.0.0.1:{PORT}/")
    if urls:
        print("On your phone, same Wi-Fi:")
        for url in urls:
            print(f"  {url}")
    else:
        print("Could not detect LAN name. Check Wi-Fi.")
    print("Leave this window open. Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
