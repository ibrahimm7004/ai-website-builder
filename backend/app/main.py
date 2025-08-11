# backend/app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pathlib import Path
import uuid  # (not strictly needed now, but fine to keep)

from .models import SiteSpec
from .services.site_generator import build_prompt_from_spec, generate_site, write_files

app = FastAPI(title="Site Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_class=PlainTextResponse)
def root():
    return "API is running. Visit /docs or /api/health."


@app.get("/api/health")
def health():
    return {"ok": True}


# Write outputs here (backend/site_out)
BASE_DIR = Path(__file__).resolve().parent.parent  # -> backend/
SITE_OUT_DIR = BASE_DIR / "site_out"
SITE_OUT_DIR.mkdir(parents=True, exist_ok=True)


@app.post("/api/generate")
def api_generate(spec: SiteSpec):
    try:
        # Pydantic v1/v2 compat
        spec_dict = spec.model_dump() if hasattr(spec, "model_dump") else spec.dict()

        prompt = build_prompt_from_spec(spec_dict)
        manifest = generate_site(prompt, retries=1)

        # Write index.html, styles.css, script.js to backend/site_out
        written = write_files(manifest, SITE_OUT_DIR)

        return {
            "ok": True,
            "dir": str(SITE_OUT_DIR.resolve()),
            "written": written,
            "manifest": manifest,  # keep for debugging; remove later if you want
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
