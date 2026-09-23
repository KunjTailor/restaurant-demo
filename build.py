#!/usr/bin/env python3
"""
Builds the static Porta Blu demo site.

    python3 build.py

Reads   src/pages/*.html     (each page body, with a small front-matter block)
        src/partials/*.html  (head, header, footer, icons, mobile bar)
        src/assets/*         (CSS, JS — copied as-is)
Writes  docs/                (plain HTML/CSS/JS — GitHub Pages serves this folder;
                              you can also upload it to Netlify, Vercel or any host)

Page front matter (top of each page file):

    ---
    title: Page title
    description: Meta description
    nav: menu            # which nav item is current (menu, order, catering, about, visit)
    og: <unsplash id>    # optional social-preview image
    htmlclass: menu-page # optional
    ---

Reusable snippets:  {{include:map}}  inserts src/partials/map.html

Image shorthands usable anywhere in pages/partials:

    {{src:ID:W:H}}                  -> one Unsplash URL cropped to W x H
    {{srcset:ID:RW:RH:480,800,1200}} -> srcset at those widths, aspect RW:RH
"""

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
OUT = ROOT / "docs"

DEFAULT_OG = "1622880833523-7cf1c0bd4296"


def unsplash(photo_id, w, h, q=72):
    return f"https://images.unsplash.com/photo-{photo_id}?auto=format&fit=crop&w={w}&h={h}&q={q}"


def expand_images(html):
    def src(m):
        return unsplash(m.group(1), m.group(2), m.group(3))

    def srcset(m):
        pid, rw, rh, widths = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4)
        parts = []
        for w in widths.split(","):
            w = int(w)
            parts.append(f"{unsplash(pid, w, round(w * rh / rw))} {w}w")
        return ", ".join(parts)

    html = re.sub(r"\{\{src:([\w-]+):(\d+):(\d+)\}\}", src, html)
    html = re.sub(r"\{\{srcset:([\w-]+):(\d+):(\d+):([\d,]+)\}\}", srcset, html)
    return html


def read_page(path):
    text = path.read_text()
    meta = {}
    m = re.match(r"---\n(.*?)\n---\n", text, re.S)
    if m:
        for line in m.group(1).splitlines():
            if ":" in line:
                key, value = line.split(":", 1)
                meta[key.strip()] = value.strip()
        text = text[m.end():]
    return meta, text


def expand_includes(html, partial):
    return re.sub(r"\{\{include:([\w-]+)\}\}", lambda m: partial[m.group(1)], html)


def build():
    partial = {p.stem: p.read_text() for p in (SRC / "partials").glob("*.html")}

    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "assets").mkdir(parents=True)
    for asset in (SRC / "assets").iterdir():
        shutil.copy2(asset, OUT / "assets" / asset.name)
    (OUT / ".nojekyll").write_text("")  # serve files as-is on GitHub Pages

    for page in sorted((SRC / "pages").glob("*.html")):
        meta, body = read_page(page)
        nav = meta.get("nav", "")

        header = partial["header"]
        mobilebar = partial["mobilebar"]
        # Mark the current page in the nav and the mobile bar.
        header = re.sub(
            rf'data-nav="{nav}"', 'aria-current="page"', header
        ) if nav else header
        header = re.sub(r'\sdata-nav="[\w-]+"', "", header)
        mobilebar = re.sub(
            rf'data-nav="{nav}"', 'aria-current="page"', mobilebar
        ) if nav else mobilebar
        mobilebar = re.sub(r'\sdata-nav="[\w-]+"', "", mobilebar)

        head = (
            partial["head"]
            .replace("{{TITLE}}", meta.get("title", "Porta Blu"))
            .replace("{{DESC}}", meta.get("description", ""))
            .replace("{{OG_IMAGE}}", unsplash(meta.get("og", DEFAULT_OG), 1200, 630, 75))
            .replace("{{PAGE}}", page.name)
            .replace("{{HTMLCLASS}}", meta.get("htmlclass", ""))
        )

        html = "\n".join([
            head,
            partial["icons"],
            partial["announce"] if meta.get("announce", "yes") != "no" else "",
            header,
            '<main id="main">',
            body.strip(),
            "</main>",
            partial["footer"],
            mobilebar,
            '<div class="toast" role="status" aria-live="polite"></div>',
            '<script src="assets/main.js" defer></script>',
            "</body>\n</html>\n",
        ])
        html = expand_images(expand_includes(html, partial))
        (OUT / page.name).write_text(html)
        print(f"built docs/{page.name}")


if __name__ == "__main__":
    build()
