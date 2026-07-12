import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { ArrowDown, ArrowUp, Check, Download, ExternalLink, Eye, Loader2, Monitor, RotateCcw, Smartphone, Sparkles, Tablet, X } from "lucide-react";
import { createPreviewDocument, generateSite, type GenerateResponse, type SectionId, type SiteSpec } from "./api";

const SECTION_LABELS: Record<SectionId, string> = { nav: "Navigation", hero: "Hero", features: "Features", social_proof: "Proof", deep_dive: "Deep dive", pricing: "Pricing", faq: "FAQ", cta_final: "Final CTA", footer: "Footer" };
const INITIAL_SECTIONS = (Object.keys(SECTION_LABELS) as SectionId[]).map((id) => ({ id, enabled: id !== "pricing" }));
const INITIAL: SiteSpec = {
  brand: "", tagline: "", business_description: "", target_audience: "", primary_goal: "Generate qualified leads",
  differentiators: [], proof_points: [], theme: "Modern editorial", color_palette: "",
  tone: "authoritative", layout_style: "editorial", motion_level: "subtle", quality_tier: "production",
  primary_cta: "Get started", primary_cta_url: "#contact", secondary_cta: "Learn more",
  secondary_cta_url: "#features", sections: INITIAL_SECTIONS,
};
type Viewport = "desktop" | "tablet" | "mobile";
const BUILD_STAGES = [
  { label: "Reading your brief", detail: "Finding the strongest positioning and audience insight." },
  { label: "Shaping the creative direction", detail: "Choosing a distinctive visual language, rhythm, and narrative." },
  { label: "Writing the page story", detail: "Turning your real differentiators into focused, credible copy." },
  { label: "Building the responsive website", detail: "Composing production HTML, CSS, interactions, and mobile layouts." },
  { label: "Inspecting every detail", detail: "Checking semantics, accessibility, links, SEO, and runtime safety." },
  { label: "Applying the final polish", detail: "Repairing anything that does not meet the production quality bar." },
];

function Field({ label, hint, children, wide }: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`field ${wide ? "field--wide" : ""}`}><span>{label}</span>{hint && <small>{hint}</small>}{children}</label>;
}
function splitLines(value: string) { return value.split("\n").map((item) => item.trim()).filter(Boolean); }

export default function App() {
  const [spec, setSpec] = useState<SiteSpec>(INITIAL);
  const [listText, setListText] = useState({ differentiators: "", proof_points: "" });
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [activePanel, setActivePanel] = useState<"preview" | "strategy" | "quality">("preview");
  const [buildStage, setBuildStage] = useState(0);
  const [previewKey, setPreviewKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLElement | null>(null);
  const preview = useMemo(() => result ? createPreviewDocument(result.files) : "", [result]);

  useEffect(() => {
    if (status !== "generating") return;
    setBuildStage(0);
    const timer = window.setInterval(() => setBuildStage((stage) => Math.min(stage + 1, BUILD_STAGES.length - 1)), 6500);
    return () => window.clearInterval(timer);
  }, [status]);

  function update<K extends keyof SiteSpec>(key: K, value: SiteSpec[K]) { setSpec((current) => ({ ...current, [key]: value })); }
  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= spec.sections.length) return;
    const sections = [...spec.sections]; [sections[index], sections[target]] = [sections[target], sections[index]];
    update("sections", sections);
  }
  function toggleSection(id: SectionId) {
    update("sections", spec.sections.map((section) => section.id === id ? { ...section, enabled: !section.enabled } : section));
  }
  async function onGenerate() {
    if (!spec.brand.trim() || !spec.business_description.trim()) {
      setError("Add a brand name and a short description of the business to continue."); setStatus("error"); return;
    }
    const controller = new AbortController(); abortRef.current = controller;
    setStatus("generating"); setError(""); setActivePanel("preview");
    window.setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    try {
      const payload = { ...spec, differentiators: splitLines(listText.differentiators), proof_points: splitLines(listText.proof_points) };
      const generated = await generateSite(payload, controller.signal);
      setResult(generated); setPreviewKey((key) => key + 1); setStatus("done"); setActivePanel("preview");
    } catch (err) {
      if ((err as Error).name !== "AbortError") { setError((err as Error).message); setStatus("error"); }
      else setStatus("idle");
    } finally { abortRef.current = null; }
  }
  async function download() {
    if (!result) return;
    const zip = new JSZip(); result.files.forEach((file) => zip.file(file.path, file.content));
    zip.file("README.md", `# ${spec.brand}\n\nGenerated with Canvas. Open index.html or deploy these static files.`);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `${spec.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "website"}.zip`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function openPreview() {
    if (!preview) return; const blob = new Blob([preview], { type: "text/html" });
    const url = URL.createObjectURL(blob); window.open(url, "_blank", "noopener,noreferrer"); setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return <div className="app-shell">
    <header className="topbar"><a className="wordmark" href="#top"><span><Sparkles size={17} /></span>Canvas</a><div className="topbar__meta"><span className="status-dot" />AI website studio</div></header>
    <main id="top">
      <section className="intro"><p className="eyebrow">Creative direction → production code</p><h1>Build a site that feels<br /><em>designed, not generated.</em></h1><p>Give Canvas the truth about your business. It develops the strategy, art direction, copy, and production-ready website—then validates the result before you see it.</p></section>

      <div className="workspace">
        <section className="brief-panel" aria-label="Website brief">
          <div className="panel-heading"><div><span>01</span><h2>Creative brief</h2></div><p>Specific input creates specific design.</p></div>
          <div className="form-grid">
            <Field label="Brand name · Required"><input value={spec.brand} onChange={(e) => update("brand", e.target.value)} placeholder="e.g. Northstar Finance" maxLength={100} required /></Field>
            <Field label="Tagline · Optional"><input value={spec.tagline} onChange={(e) => update("tagline", e.target.value)} placeholder="Canvas can write one for you" maxLength={180} /></Field>
            <Field label="What does the business do? · Required" hint="A couple of sentences is enough to get started." wide><textarea value={spec.business_description} onChange={(e) => update("business_description", e.target.value)} placeholder="Describe the product or service and why it is useful…" rows={4} maxLength={1200} required /></Field>
            <Field label="Who is this for? · Optional" hint="Leave blank and Canvas will infer the likely audience." wide><textarea value={spec.target_audience || ""} onChange={(e) => update("target_audience", e.target.value)} placeholder="e.g. Independent financial advisors who…" rows={3} maxLength={500} /></Field>
            <Field label="Primary conversion goal"><input value={spec.primary_goal} onChange={(e) => update("primary_goal", e.target.value)} maxLength={240} /></Field>
            <Field label="Visual direction"><select value={spec.theme} onChange={(e) => update("theme", e.target.value)}><option>Modern editorial</option><option>Technical precision</option><option>Warm and human</option><option>Luxury minimalism</option><option>Bold experimental</option></select></Field>
            <Field label="Differentiators · Optional" hint="One factual point per line." wide><textarea value={listText.differentiators} onChange={(e) => setListText({ ...listText, differentiators: e.target.value })} placeholder={"Built for…\nUnlike alternatives…\nUnique capability…"} rows={4} /></Field>
            <Field label="Proof points · Optional" hint="Only real metrics, credentials, or customer evidence." wide><textarea value={listText.proof_points} onChange={(e) => setListText({ ...listText, proof_points: e.target.value })} placeholder={"One factual proof point per line."} rows={3} /></Field>
            <Field label="Reference direction · Optional" hint="Describe sites, eras, or visual ideas you admire." wide><textarea value={spec.reference_direction || ""} onChange={(e) => update("reference_direction", e.target.value)} placeholder="Editorial typography, generous negative space…" rows={3} maxLength={800} /></Field>
            <Field label="Avoid · Optional" hint="Patterns, colors, or clichés you do not want." wide><input value={spec.avoid_direction || ""} onChange={(e) => update("avoid_direction", e.target.value)} placeholder="No glowing orbs, no fake dashboards…" maxLength={500} /></Field>
          </div>

          <div className="subsection"><div className="subsection__heading"><h3>Page architecture</h3><p>Toggle and reorder the narrative.</p></div><div className="section-list">{spec.sections.map((section, index) => <div className={`section-row ${section.enabled ? "is-on" : ""}`} key={section.id}><button className="section-toggle" onClick={() => toggleSection(section.id)} aria-pressed={section.enabled}><span>{section.enabled ? <Check size={13} /> : <X size={13} />}</span>{SECTION_LABELS[section.id]}</button><div><button onClick={() => moveSection(index, -1)} disabled={index === 0} aria-label={`Move ${SECTION_LABELS[section.id]} up`}><ArrowUp size={15} /></button><button onClick={() => moveSection(index, 1)} disabled={index === spec.sections.length - 1} aria-label={`Move ${SECTION_LABELS[section.id]} down`}><ArrowDown size={15} /></button></div></div>)}</div></div>

          <div className="subsection"><div className="subsection__heading"><h3>Art direction & conversion</h3><p>Fine-tune the output.</p></div><div className="form-grid">
            <Field label="Tone"><select value={spec.tone} onChange={(e) => update("tone", e.target.value)}><option>authoritative</option><option>conversational</option><option>bold</option><option>playful</option><option>luxury</option><option>technical</option></select></Field>
            <Field label="Layout"><select value={spec.layout_style} onChange={(e) => update("layout_style", e.target.value)}><option>editorial</option><option>split</option><option>centered</option><option>immersive</option><option>bento</option></select></Field>
            <Field label="Motion"><select value={spec.motion_level} onChange={(e) => update("motion_level", e.target.value)}><option>none</option><option>subtle</option><option>expressive</option></select></Field>
            <Field label="Quality"><select value={spec.quality_tier} onChange={(e) => update("quality_tier", e.target.value as SiteSpec["quality_tier"])}><option value="draft">Draft — fastest</option><option value="production">Production — recommended</option><option value="premium">Premium — maximum quality</option></select></Field>
            <Field label="Primary CTA"><input value={spec.primary_cta} onChange={(e) => update("primary_cta", e.target.value)} /></Field><Field label="Primary destination"><input value={spec.primary_cta_url} onChange={(e) => update("primary_cta_url", e.target.value)} placeholder="#contact or https://…" /></Field>
            <Field label="Secondary CTA"><input value={spec.secondary_cta} onChange={(e) => update("secondary_cta", e.target.value)} /></Field><Field label="Secondary destination"><input value={spec.secondary_cta_url} onChange={(e) => update("secondary_cta_url", e.target.value)} /></Field>
            <Field label="Non-negotiable content" wide><textarea value={spec.required_content || ""} onChange={(e) => update("required_content", e.target.value)} placeholder="Legal copy, specific features, contact details…" rows={3} maxLength={1500} /></Field>
          </div></div>

          {status === "error" && <div className="error-banner" role="alert"><X size={17} /><span>{error}</span></div>}
          <div className={`generate-bar ${status === "generating" ? "is-generating" : ""}`}><div><strong>{status === "generating" ? BUILD_STAGES[buildStage].label : "Ready to create"}</strong><span>{status === "generating" ? BUILD_STAGES[buildStage].detail : "Strategy, design, code, and QA in one run."}</span></div><div className="generate-actions">{status === "generating" && <span className="button-loader" aria-hidden="true"><Loader2 size={19} /></span>}{status === "generating" ? <button className="cancel-button" onClick={() => abortRef.current?.abort()}><X size={16} /> Cancel</button> : <button className="generate-button" onClick={onGenerate}><Sparkles size={18} /> {result ? "Generate a new direction" : "Design my website"}</button>}</div></div>
        </section>

        <section className="output-panel" aria-live="polite" ref={outputRef}>
          <div className="output-top"><div className="tabs">{(["preview", "strategy", "quality"] as const).map((tab) => <button className={activePanel === tab ? "active" : ""} onClick={() => setActivePanel(tab)} key={tab}>{tab}</button>)}</div>{result && <div className="actions"><button onClick={download}><Download size={15} /> Export</button><button onClick={openPreview}><ExternalLink size={15} /> Open</button></div>}</div>
          {!result && status !== "generating" && <div className="empty-state"><div><Eye size={28} /></div><h2>Your website will appear here</h2><p>Complete the brief and Canvas will create, validate, and prepare a responsive site you can preview and export.</p><ul><li><Check size={14} /> Creative strategy</li><li><Check size={14} /> Production HTML, CSS & JS</li><li><Check size={14} /> Automated quality checks</li></ul></div>}
          {status === "generating" && <div className="generation-state"><div className="build-visual" aria-hidden="true"><div className="build-window"><span /><span /><span /><div className="build-lines"><i /><i /><i /><i /></div></div><div className="build-pulse" /></div><p className="eyebrow">Stage {buildStage + 1} of {BUILD_STAGES.length}</p><h2 key={BUILD_STAGES[buildStage].label}>{BUILD_STAGES[buildStage].label}</h2><p className="stage-detail">{BUILD_STAGES[buildStage].detail}</p><div className="progress-track"><span style={{ width: `${Math.max(12, ((buildStage + 1) / BUILD_STAGES.length) * 100)}%` }} /></div><div className="generation-steps">{BUILD_STAGES.map((stage, index) => <span className={index <= buildStage ? "active" : ""} key={stage.label}>{index + 1}</span>)}</div><p>Canvas is working through the full creative and engineering process. The finished site will open here automatically.</p></div>}
          {result && status !== "generating" && activePanel === "preview" && <div className="preview-area"><div className="preview-toolbar"><div className="viewport-picker"><button className={viewport === "desktop" ? "active" : ""} onClick={() => setViewport("desktop")} aria-label="Desktop preview"><Monitor size={16} /></button><button className={viewport === "tablet" ? "active" : ""} onClick={() => setViewport("tablet")} aria-label="Tablet preview"><Tablet size={16} /></button><button className={viewport === "mobile" ? "active" : ""} onClick={() => setViewport("mobile")} aria-label="Mobile preview"><Smartphone size={16} /></button></div><span>{viewport === "desktop" ? "1440 × 900" : viewport === "tablet" ? "768 × 1024" : "390 × 844"}</span><button onClick={() => setPreviewKey((key) => key + 1)}><RotateCcw size={14} /> Refresh</button></div><div className={`preview-frame preview-frame--${viewport}`}><iframe key={previewKey} title={`Preview of ${spec.brand}`} srcDoc={preview} sandbox="allow-scripts" /></div></div>}
          {result && activePanel === "strategy" && <div className="report"><p className="eyebrow">{result.plan.concept_name}</p><h2>{result.plan.strategy}</h2><div className="report-grid"><article><span>Audience insight</span><p>{result.plan.audience_insight}</p></article><article><span>Visual direction</span><p>{result.plan.visual_direction}</p></article><article><span>Typography</span><p>{result.plan.typography_direction}</p></article><article><span>Color</span><p>{result.plan.color_direction}</p></article><article><span>Hero concept</span><p>{result.plan.hero_concept}</p></article><article><span>Conversion</span><p>{result.plan.conversion_strategy}</p></article></div></div>}
          {result && activePanel === "quality" && <div className="report"><div className="score"><strong>{result.quality.score}</strong><span>Production<br />quality score</span></div><p className="muted">Generated with {result.model} · ID {result.generation_id.slice(0, 8)}</p><div className="checks">{Object.entries(result.quality.checks).map(([name, passed]) => <div key={name}><span className={passed ? "pass" : "fail"}>{passed ? <Check size={14} /> : <X size={14} />}</span><span>{name.replaceAll("_", " ")}</span></div>)}</div>{result.quality.warnings.length > 0 && <div className="warnings"><h3>Warnings</h3>{result.quality.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>}</div>}
        </section>
      </div>
    </main>
    <footer className="app-footer"><span>Canvas AI Website Studio</span><span>Strategy · Design · Engineering</span></footer>
  </div>;
}
