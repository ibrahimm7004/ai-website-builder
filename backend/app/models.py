from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, HttpUrl, validator

SectionId = Literal["nav", "hero", "features", "social_proof", "deep_dive", "pricing", "faq", "cta_final", "footer"]
Tone = Literal["authoritative", "conversational", "bold", "playful", "luxury", "technical"]
LayoutStyle = Literal["editorial", "split", "centered", "immersive", "bento"]
MotionLevel = Literal["none", "subtle", "expressive"]
QualityTier = Literal["draft", "production", "premium"]


class SectionSpec(BaseModel):
    id: SectionId
    enabled: bool = True


class Feature(BaseModel):
    title: str = Field(..., min_length=2, max_length=80)
    blurb: str = Field(..., min_length=4, max_length=240)
    icon_hint: Optional[str] = Field(None, max_length=80)


class PricingTier(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    price_text: str = Field(..., min_length=1, max_length=60)
    bullets: List[str] = Field(default_factory=list, max_items=8)


class FAQItem(BaseModel):
    q: str = Field(..., min_length=3, max_length=180)
    a: str = Field(..., min_length=3, max_length=500)


class BrandAsset(BaseModel):
    kind: Literal["logo", "product_screenshot", "photo", "illustration"]
    url: HttpUrl
    alt: str = Field(..., min_length=1, max_length=180)


class SiteSpec(BaseModel):
    brand: str = Field("Nebula Metrics", min_length=1, max_length=100)
    tagline: Optional[str] = Field("Cosmic-grade product analytics", max_length=180)
    business_description: str = Field(..., min_length=12, max_length=1200)
    target_audience: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional. The creative planning stage infers a likely audience when omitted.",
    )
    primary_goal: str = Field("Generate qualified leads", min_length=3, max_length=240)
    differentiators: List[str] = Field(default_factory=list, max_items=8)
    proof_points: List[str] = Field(default_factory=list, max_items=8)
    required_content: Optional[str] = Field(None, max_length=1500)
    reference_direction: Optional[str] = Field(None, max_length=800)
    avoid_direction: Optional[str] = Field(None, max_length=500)
    theme: str = Field("Modern editorial", max_length=80)
    color_palette: Optional[str] = Field(None, max_length=80)
    tone: Tone = "authoritative"
    layout_style: LayoutStyle = "editorial"
    motion_level: MotionLevel = "subtle"
    quality_tier: QualityTier = "production"
    primary_cta: str = Field("Get started", min_length=1, max_length=60)
    primary_cta_url: str = Field("#contact", max_length=500)
    secondary_cta: Optional[str] = Field("Learn more", max_length=60)
    secondary_cta_url: Optional[str] = Field("#features", max_length=500)
    sections: List[SectionSpec] = Field(default_factory=lambda: [
        SectionSpec(id="nav"), SectionSpec(id="hero"), SectionSpec(id="features"),
        SectionSpec(id="social_proof"), SectionSpec(id="deep_dive"), SectionSpec(id="pricing", enabled=False),
        SectionSpec(id="faq"), SectionSpec(id="cta_final"), SectionSpec(id="footer"),
    ], min_items=3, max_items=9)
    features: List[Feature] = Field(default_factory=list, max_items=8)
    pricing_tiers: List[PricingTier] = Field(default_factory=list, max_items=4)
    faq: List[FAQItem] = Field(default_factory=list, max_items=8)
    assets: List[BrandAsset] = Field(default_factory=list, max_items=12)
    notes: Optional[str] = Field(None, max_length=1500)

    @validator("differentiators", "proof_points", each_item=True)
    def validate_short_list_item(cls, value: str) -> str:
        value = value.strip()
        if not value or len(value) > 240:
            raise ValueError("items must contain 1-240 characters")
        return value

    @validator("sections")
    def validate_unique_sections(cls, value: List[SectionSpec]) -> List[SectionSpec]:
        ids = [section.id for section in value]
        if len(ids) != len(set(ids)):
            raise ValueError("section IDs must be unique")
        return value


class GeneratedFile(BaseModel):
    path: Literal["index.html", "styles.css", "script.js"]
    content: str


class CreativePlan(BaseModel):
    concept_name: str
    strategy: str
    audience_insight: str
    visual_direction: str
    typography_direction: str
    color_direction: str
    hero_concept: str
    conversion_strategy: str
    section_plan: List[str]
    content_guardrails: List[str]


class QualityReport(BaseModel):
    score: int = Field(..., ge=0, le=100)
    checks: Dict[str, bool]
    warnings: List[str]


class GenerateResponse(BaseModel):
    ok: Literal[True] = True
    generation_id: str
    model: str
    plan: CreativePlan
    files: List[GeneratedFile]
    quality: QualityReport
