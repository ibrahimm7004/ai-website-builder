import logging
import os
import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .models import GenerateResponse, QualityReport, SiteSpec
from .services.site_generator import generate_site

logger = logging.getLogger("site_builder")
app = FastAPI(title="Canvas AI Website Builder API", version="2.0.0")

origins = [item.strip() for item in os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",") if item.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False,
                   allow_methods=["GET", "POST", "OPTIONS"],
                   allow_headers=["Content-Type", "X-Request-ID"])


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    response = await call_next(request)
    response.headers.update({"X-Request-ID": request_id, "X-Content-Type-Options": "nosniff",
                             "Referrer-Policy": "strict-origin-when-cross-origin"})
    return response


@app.get("/api/health")
def health():
    return {"ok": True, "service": "canvas-builder", "version": app.version}


@app.post("/api/generate", response_model=GenerateResponse)
def api_generate(spec: SiteSpec):
    generation_id = str(uuid.uuid4())
    try:
        model, plan, manifest, warnings, checks = generate_site(spec)
        return GenerateResponse(generation_id=generation_id, model=model, plan=plan,
                                files=manifest["files"],
                                quality=QualityReport(score=max(0, 100 - len(warnings) * 8),
                                                      checks=checks, warnings=warnings))
    except RuntimeError as exc:
        logger.warning("generation_failed id=%s reason=%s", generation_id, exc)
        status = 503 if "OPENAI_API_KEY" in str(exc) else 422
        raise HTTPException(status_code=status, detail=str(exc))
    except Exception:
        logger.exception("generation_error id=%s", generation_id)
        raise HTTPException(status_code=500, detail=f"Generation failed. Reference: {generation_id}")


@app.exception_handler(Exception)
async def unexpected_error(_: Request, exc: Exception):
    logger.exception("unhandled_error", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "An unexpected server error occurred."})
