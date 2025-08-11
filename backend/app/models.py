from typing import List, Optional, Literal
from pydantic import BaseModel, Field

SectionId = Literal[
    "nav", "hero", "features", "social_proof",
    "deep_dive", "pricing", "faq", "cta_final", "footer"
]

Tone = Literal["formal", "neutral", "playful"]
LayoutStyle = Literal["split", "centered"]
MotionLevel = Literal["none", "light"]


class SectionSpec(BaseModel):
    id: SectionId
    enabled: bool = True


class Feature(BaseModel):
    title: str
    blurb: str
    icon_hint: Optional[str] = None


class PricingTier(BaseModel):
    name: str
    price_text: str
    bullets: List[str] = []


class FAQItem(BaseModel):
    q: str
    a: str


class SiteSpec(BaseModel):
    brand: str = "Nebula Metrics"
    tagline: Optional[str] = "Cosmic-grade product analytics"
    theme: str = "Modern SaaS"
    color_palette: Optional[str] = None

    primary_cta: str = "Get Started"
    secondary_cta: Optional[str] = "Request Demo"

    sections: List[SectionSpec] = Field(default_factory=lambda: [
        {"id": "nav", "enabled": True},
        {"id": "hero", "enabled": True},
        {"id": "features", "enabled": True},
        {"id": "social_proof", "enabled": True},
        {"id": "deep_dive", "enabled": True},
        {"id": "pricing", "enabled": True},
        {"id": "faq", "enabled": True},
        {"id": "cta_final", "enabled": True},
        {"id": "footer", "enabled": True},
    ])

    features: List[Feature] = Field(default_factory=list)
    pricing_tiers: List[PricingTier] = Field(default_factory=list)
    faq: List[FAQItem] = Field(default_factory=list)

    tone: Tone = "neutral"
    layout_style: LayoutStyle = "split"
    motion_level: MotionLevel = "light"

    notes: Optional[str] = None
