"""
site_generator.py
Generate a multi-file landing page (index.html, styles.css, script.js)
using OpenAI Responses API + Structured Outputs (json_schema, strict: true).

Requires:
  pip install openai python-dotenv

.env:
  OPENAI_API_KEY=sk-...
"""

import os
import json
import re
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv

# =========================
# Config
# =========================
MODEL = "gpt-5-mini"          # use "gpt-5" later for higher quality
MAX_COMPLETION_TOKENS = 10000  # conservative cap to avoid truncation early on
OUT_DIR = Path("site_out")    # output folder

# Keep outputs compact to avoid token pressure
HTML_MAX_LINES = 280
CSS_MAX_LINES = 280
JS_MAX_LINES = 160

# =========================
# Setup
# =========================
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
OUT_DIR.mkdir(parents=True, exist_ok=True)

# =========================
# Strict JSON Schema (exactly 3 files)
# =========================
SCHEMA_OBJECT = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "files": {
            "type": "array",
            "minItems": 3,
            "maxItems": 3,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "path": {
                        "type": "string",
                        "enum": ["index.html", "styles.css", "script.js"]
                    },
                    "content": {"type": "string"}
                },
                "required": ["path", "content"]
            }
        }
    },
    "required": ["files"]
}

# =========================
# Prompt Builder
# =========================

# ADD at top


def build_prompt_from_spec(spec: dict,
                           html_cap=280, css_cap=280, js_cap=160) -> str:
    """
    Builds the same high-quality landing-page prompt, but feeds the
    user's structured site_spec JSON into the instructions.
    """
    spec_json = json.dumps(spec, ensure_ascii=False, separators=(",", ":"))
    return f"""
You are a senior front-end engineer. Build a polished, production-ready LANDING PAGE.

RULES
- Return ONLY JSON matching the provided schema (no markdown, no backticks, no prose).
- Exactly three files: index.html, styles.css, script.js.
- index.html MUST reference styles.css via <link rel="stylesheet" href="styles.css">
  and script.js via <script src="script.js" defer></script>.
- If USER_SPEC conflicts with these RULES, follow RULES.

USER_SPEC (JSON):
{spec_json}

SECTIONS
- Render only sections where enabled=true, in the order provided by USER_SPEC.sections.
- Expected section ids: nav, hero, features, social_proof, deep_dive, pricing, faq, cta_final, footer.

DESIGN & UX
- Superb hierarchy, spacing, rhythm; accessible color contrast.
- Semantic HTML5 landmarks (header/nav/main/section/footer).
- Mobile-first responsive layout; use clamp() for fluid type scales.
- Respect prefers-reduced-motion; tasteful micro-motion otherwise.
- Use CSS custom properties (e.g., --bg, --fg, --accent). BEM-ish classes.
- No external assets (no CDNs, fonts, images). Small inline SVGs OK.
- Focus states must be clearly visible.

JS BEHAVIOR (LIGHT)
- Mobile nav toggle (with ARIA attributes).
- In-page smooth scrolling (respect reduced motion).
- No external deps; robust, minimal code.

COPY & SIZE GUARDRAILS
- Keep copy concise (avoid walls of text).
- Hard caps: HTML ≤ ~{html_cap} lines, CSS ≤ ~{css_cap} lines, JS ≤ ~{js_cap} lines.
- No base64 images or large inline data.

QUALITY BAR
- All nav links map to section IDs.
- Lint-friendly, well-structured code.

Now produce the three files.
""".strip()


def build_prompt(
    brand="Nebula Metrics",
    theme="premium cosmic tech / modern SaaS",
    primary_cta="Start Free",
    secondary_cta="Request Demo"
) -> str:
    return f"""
You are a senior front-end engineer. Build a polished, production-ready LANDING PAGE.

OUTPUT CONTRACT
- Return ONLY JSON matching the provided schema (no markdown, no backticks, no prose).
- Exactly three files: index.html, styles.css, script.js.
- index.html MUST reference styles.css via <link rel="stylesheet" href="styles.css"> and script.js via <script src="script.js" defer></script>.

SITE BRIEF
- Brand: "{brand}"
- Theme: {theme}
- Primary CTA: "{primary_cta}"  |  Secondary CTA: "{secondary_cta}"

SECTIONS (in order)
1) Header/Nav (brand/logo left; anchor links right; mobile menu button)
2) Hero (headline, short subheading, both CTAs)
3) Features (3–6 concise feature cards)
4) Social proof (logos or compact testimonial strip)
5) Deep-dive section (one value prop with bullets)
6) Pricing teaser (2–3 simple tiers, no long tables)
7) FAQ (4–6 short Q/A)
8) Final CTA band
9) Footer (links, copyright)

DESIGN & UX
- Superb hierarchy, spacing, rhythm; accessible color contrast.
- Semantic HTML5 landmarks (header/nav/main/section/footer).
- Mobile-first responsive layout; use clamp() for fluid type scales.
- Respect prefers-reduced-motion; tasteful micro-motion otherwise.
- Use CSS custom properties (e.g., --bg, --fg, --accent).
- BEM-ish class naming; utility helpers welcome.
- No external assets (no CDNs, fonts, images). Small inline SVGs OK.

JS BEHAVIOR (LIGHT)
- Mobile nav toggle (with ARIA attributes).
- In-page smooth scrolling (respect reduced motion).
- No external deps; robust, minimal code.

COPY & SIZE GUARDRAILS
- Keep copy concise (no lorem paragraph walls).
- Hard caps: HTML ≤ ~{HTML_MAX_LINES} lines, CSS ≤ ~{CSS_MAX_LINES} lines, JS ≤ ~{JS_MAX_LINES} lines.
- No base64 images or large inline data.

QUALITY BAR
- All nav links map to section IDs.
- Focus states clearly visible.
- Lint-friendly, well-structured code.
Now produce the three files.
""".strip()


# =========================
# Validators
# =========================
def validate_manifest(manifest: dict) -> tuple[bool, list[str]]:
    errs = []
    if not isinstance(manifest, dict) or "files" not in manifest:
        return False, ["Manifest missing 'files' key"]

    files = manifest.get("files", [])
    if len(files) != 3:
        errs.append(f"Expected 3 files, got {len(files)}")

    names = {f.get("path") for f in files if isinstance(f, dict)}
    required = {"index.html", "styles.css", "script.js"}
    if names != required:
        errs.append(
            f"Filenames mismatch. Got {sorted(list(names))}, expected {sorted(list(required))}")

    cmap = {f["path"]: f.get("content", "")
            for f in files if isinstance(f, dict) and "path" in f}

    # HTML checks
    html = cmap.get("index.html", "")
    if not html.strip():
        errs.append("index.html is empty")
    if "<!doctype html" not in html.lower():
        errs.append("index.html missing <!doctype html>")
    if 'href="styles.css"' not in html:
        errs.append("index.html missing link to styles.css")
    if 'src="script.js"' not in html:
        errs.append("index.html missing script.js reference")
    if "<main" not in html.lower():
        errs.append("index.html missing <main> landmark")
    if "```" in html:
        errs.append("index.html contains markdown fences ```")
    if html.count("\n") > HTML_MAX_LINES:
        errs.append(f"index.html too long (> {HTML_MAX_LINES} lines)")

    # CSS checks
    css = cmap.get("styles.css", "")
    if not css.strip():
        errs.append("styles.css is empty")
    if "```" in css:
        errs.append("styles.css contains markdown fences ```")
    if css.count("\n") > CSS_MAX_LINES:
        errs.append(f"styles.css too long (> {CSS_MAX_LINES} lines)")

    # JS checks
    js = cmap.get("script.js", "")
    if not js.strip():
        errs.append("script.js is empty")
    if "```" in js:
        errs.append("script.js contains markdown fences ```")
    if js.count("\n") > JS_MAX_LINES:
        errs.append(f"script.js too long (> {JS_MAX_LINES} lines)")
    # Discourage external calls in this v1
    if re.search(r"\bhttps?://", js, flags=re.I):
        errs.append("script.js references external URLs")

    return (len(errs) == 0, errs)


# =========================
# OpenAI call (with repair pass)
# =========================
def call_model(prompt: str) -> dict:
    resp = client.responses.create(
        model=MODEL,
        input=prompt,
        max_output_tokens=MAX_COMPLETION_TOKENS,
        text={
            "format": {
                "type": "json_schema",
                "name": "website_manifest",
                "schema": SCHEMA_OBJECT,   # << root JSON Schema object
                "strict": True
            }
        },
        store=False,
    )

    manifest = getattr(resp, "output_parsed", None)
    if manifest is None:
        txt = getattr(resp, "output_text", None)
        if not txt or not txt.strip():
            if getattr(resp, "error", None):
                raise RuntimeError(f"OpenAI error: {resp.error}")
            raise ValueError("No output returned from model.")
        try:
            manifest = json.loads(txt)
        except json.JSONDecodeError as e:
            snippet = txt[:400].replace("\n", "\\n")
            raise ValueError(
                f"Model output was not valid JSON: {e}. Snippet: {snippet} ...") from e

    status = getattr(resp, "status", "completed")
    if status != "completed":
        raise RuntimeError(f"Response not completed (status={status}).")

    return manifest


def generate_site(prompt: str, retries: int = 1) -> dict:
    manifest = call_model(prompt)
    ok, errs = validate_manifest(manifest)
    if ok:
        return manifest

    if retries > 0:
        repair_instructions = (
            "REPAIR ONLY the issues below without changing filenames or adding/removing files. "
            "Keep the same schema and keep content concise.\n- " +
            "\n- ".join(errs)
        )
        repair_prompt = prompt + "\n\n" + repair_instructions
        manifest = call_model(repair_prompt)
        ok, errs = validate_manifest(manifest)

    if not ok:
        raise RuntimeError(
            "Validation failed after repair: " + "; ".join(errs))
    return manifest


# =========================
# File writer
# =========================
def write_files(manifest: dict, out_dir: Path = OUT_DIR) -> list[str]:
    written = []
    for f in manifest["files"]:
        filename = Path(f["path"]).name  # prevent directories
        path = out_dir / filename
        path.write_text(f["content"], encoding="utf-8")
        written.append(str(path.resolve()))
    return written


# =========================
# Main
# =========================
if __name__ == "__main__":
    prompt = build_prompt(
        brand="Nebula Metrics",
        theme="premium cosmic tech / modern SaaS",
        primary_cta="Start Free",
        secondary_cta="Request Demo",
    )

    try:
        manifest = generate_site(prompt, retries=1)
        files = write_files(manifest, OUT_DIR)
        print("Wrote files:")
        for p in files:
            print(" -", p)
        print(f"\nOpen {OUT_DIR / 'index.html'} in your browser.")
    except Exception as e:
        print("ERROR:", e)
