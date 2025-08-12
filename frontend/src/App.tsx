import { useMemo, useState, useEffect } from "react";
import { Loader2, ChevronUp, ChevronDown, HelpCircle } from "lucide-react";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ---------------- types / constants ----------------
type SectionKey =
  | "nav" | "hero" | "features" | "social_proof" | "deep_dive"
  | "pricing" | "faq" | "cta_final" | "footer";

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? "http://127.0.0.1:8000";

const ALL_SECTIONS: { id: SectionKey; label: string }[] = [
  { id: "nav",          label: "Header / Nav Bar" },
  { id: "hero",         label: "Hero" },
  { id: "features",     label: "Features" },
  { id: "social_proof", label: "Social Proof" },
  { id: "deep_dive",    label: "Deep Dive" },
  { id: "pricing",      label: "Pricing" },
  { id: "faq",          label: "FAQ" },
  { id: "cta_final",    label: "Final CTA" },
  { id: "footer",       label: "Footer" },
];

const FIXED_TOP: SectionKey = "nav";
const FIXED_BOTTOM: SectionKey = "footer";
const FIXED = new Set<SectionKey>([FIXED_TOP, FIXED_BOTTOM]);

const THEMES = ["modern_saas", "minimal", "playful", "elegant", "industrial"] as const;
const COLOR_PALETTES = ["indigo_pink", "blue_cyan", "violet_fuchsia", "slate_amber", "emerald_lime"] as const;
const CTA_OPTIONS = ["Start Free", "Request Demo", "Get Started", "Contact Sales"] as const;
const TONE = ["formal", "playful"] as const;
const LAYOUT = ["split", "centered"] as const;
const MOTION = ["none", "light"] as const;

// ---------------- helpers ----------------
function InlineField(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="w-24 shrink-0 text-sm text-muted-foreground leading-none">
        {props.label}
      </Label>
      <div className="flex-1">{props.children}</div>
    </div>
  );
}
function clampString(s: string, max = 500) { return s.length <= max ? s : s.slice(0, max); }
function pruneEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  (Object.keys(obj) as (keyof T)[]).forEach((k) => {
    const v = obj[k]; if (v !== "" && v !== null && v !== undefined) out[k] = v;
  });
  return out;
}

/** Ensure nav is always first and footer always last, preserving relative order of others. */
function clampOrder(order: SectionKey[]): SectionKey[] {
  const middle = order.filter((s) => s !== FIXED_TOP && s !== FIXED_BOTTOM);
  return [FIXED_TOP, ...middle, FIXED_BOTTOM];
}

// ---------------- split pill row ----------------
function SectionRow({
  id, label, idx, isOn, count, onMove, onToggle,
  onDragStart, onDragOverRow, onDropRow, isFixed
}: {
  id: SectionKey;
  label: string;
  idx: number;
  isOn: boolean;
  count: number;
  onMove: (id: SectionKey, dir: -1|1) => void;
  onToggle: (id: SectionKey) => void;

  // DnD
  onDragStart: (id: SectionKey) => void;
  onDragOverRow: (overIndex: number) => void;
  onDropRow: () => void;

  // fixed row flags
  isFixed: boolean;
}) {
  const canUp   = !isFixed && idx > 0;
  const canDown = !isFixed && idx < count - 1;

  return (
    <div className="relative mx-auto w-full sm:w-[85%] md:w-[70%]">
      <div
        role="switch"
        aria-checked={isOn}
        tabIndex={0}
        onClick={() => onToggle(id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle(id);
          }
        }}
        draggable={!isFixed}
        onDragStart={(e) => {
          if (isFixed) return;
          e.dataTransfer.effectAllowed = "move";
          const img = new Image();
          img.src =
            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=";
          e.dataTransfer.setDragImage(img, 0, 0);

          e.currentTarget.classList.add("dragging");
          onDragStart(id);
        }}
        onDragOver={(e) => {
          if (isFixed) return;
          e.preventDefault();
          e.currentTarget.classList.add("drag-over");
          onDragOverRow(idx);
        }}
        onDragEnter={(e) => {
          if (isFixed) return;
          e.preventDefault();
          e.currentTarget.classList.add("drag-over");
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove("drag-over");
        }}
        onDrop={(e) => {
          if (isFixed) return;
          e.preventDefault();
          e.currentTarget.classList.remove("drag-over");
          onDropRow();
        }}
        onDragEnd={(e) => {
          e.currentTarget.classList.remove("dragging");
          e.currentTarget.classList.remove("drag-over");
        }}
        className={[
          "split-pill relative overflow-hidden rounded-full border select-none",
          "h-16 md:h-20 px-2",
          "transition-colors",
          isOn ? "cursor-pointer" : "opacity-70 grayscale cursor-pointer",
          isFixed ? "cursor-default" : "md:active:cursor-grabbing",
        ].join(" ")}
        title={isOn ? "Click to turn off" : "Click to turn on"}
      >
        {/* Decorative left/right “rails” */}
<div
  className="pill-side absolute inset-y-0 left-0 w-14 rounded-l-full pointer-events-none"
  style={{ borderLeft: "none" }}
/>
<div
  className="pill-side absolute inset-y-0 right-0 w-14 rounded-r-full pointer-events-none"
  style={{ borderRight: "none" }}
/>

{/* Hover highlight in the middle */}
<div className="pill-center absolute inset-y-0 left-14 right-14 rounded-full pointer-events-none" />

{/* Left Arrow — hidden for fixed rows */}
{!isFixed && (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className="absolute left-1 top-1/2 -translate-y-1/2 h-10 w-10 md:cursor-grab md:active:cursor-grabbing"
    onClick={(e) => {
      e.stopPropagation();
      onMove(id, -1);
    }}
    disabled={!canUp}
    title="Move up (drag anywhere to reorder)"
  >
    <ChevronUp className="h-5 w-5 md:h-6 md:w-6" />
  </Button>
)}

{/* Center label (between rails) */}
<div className="pointer-events-none absolute inset-y-0 left-14 right-14 grid place-items-center">
  <span className="text-lg md:text-xl font-semibold tracking-tight text-foreground">
    {label} {!isOn && <span className="ml-1 text-muted-foreground text-sm">(off)</span>}
  </span>
</div>

{/* Right Arrow — hidden for fixed rows */}
{!isFixed && (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 md:cursor-grab md:active:cursor-grabbing"
    onClick={(e) => {
      e.stopPropagation();
      onMove(id, +1);
    }}
    disabled={!canDown}
    title="Move down (drag anywhere to reorder)"
  >
    <ChevronDown className="h-5 w-5 md:h-6 md:w-6" />
  </Button>
)}

      </div>
    </div>
  );
}

// ---------------- main ----------------
export default function App() {
  // basics
  const [brand, setBrand] = useState("");
  const [tagline, setTagline] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [theme, setTheme] = useState<string>("");
  const [palette, setPalette] = useState<string>("");
  const [primaryCta, setPrimaryCta] = useState<string>("");
  const [secondaryCta, setSecondaryCta] = useState<string>("");

  // advanced
  const [tone, setTone] = useState<string>("");
  const [layout, setLayout] = useState<string>("");
  const [motion, setMotion] = useState<string>("");

  const [notes, setNotes] = useState("");

  // sections (enabled + order)
  const [enabledSections, setEnabledSections] = useState<SectionKey[]>(
    ALL_SECTIONS.map((s) => s.id) // both nav + footer ON by default
  );
  const [order, setOrder] = useState<SectionKey[]>(clampOrder(ALL_SECTIONS.map((s) => s.id)));
  const enabledSet = useMemo(() => new Set(enabledSections), [enabledSections]);

  useEffect(() => {
    if (!palette) return; // keep whatever index.html set (yellow)
    document.documentElement.setAttribute("data-palette", palette);
  }, [palette]);

  // drag state
  const [draggingId, setDraggingId] = useState<SectionKey | null>(null);

  function move(id: SectionKey, dir: -1 | 1) {
    if (FIXED.has(id)) return; // fixed rows cannot move
    setOrder((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(j, 0, item);
      return clampOrder(next);
    });
  }

  function toggleSection(id: SectionKey) {
    setEnabledSections((prev) => {
      const isOn = prev.includes(id);
      if (isOn) {
        // turn OFF
        if (FIXED.has(id)) {
          // fixed items stay in place; do NOT push to bottom
          return prev.filter((x) => x !== id);
        }
        // non-fixed: remove from enabled and push to bottom (but keep footer last)
        setOrder((o) => {
          const idx = o.indexOf(id);
          if (idx === -1) return o;
          const next = [...o];
          next.splice(idx, 1);
          next.splice(next.length - 1, 0, id); // insert just before footer
          return clampOrder(next);
        });
        return prev.filter((x) => x !== id);
      }
      // turn ON
      return [...prev, id];
    });
  }

  // DnD handlers (HTML5; no libs)
  function onDragStartRow(id: SectionKey) {
    if (FIXED.has(id)) return; // cannot start dragging fixed rows
    setDraggingId(id);
  }
  function onDragOverRow(overIndex: number) {
    setOrder((prev) => {
      if (!draggingId || FIXED.has(draggingId)) return prev;
      const from = prev.indexOf(draggingId);
      if (from === -1 || from === overIndex) return prev;

      // compute target index but never drop before nav or after footer
      const next = [...prev];
      next.splice(from, 1);
      next.splice(overIndex, 0, draggingId);
      return clampOrder(next);
    });
  }
  function onDropRow() {
    setDraggingId(null);
  }

  async function onGenerate() {
    if (isGenerating) return;
    setIsGenerating(true);

    const sections = order.map((id) => ({ id, enabled: enabledSet.has(id) }));
    const site_spec = pruneEmpty({
      brand, tagline, theme, color_palette: palette,
      primary_cta: primaryCta, secondary_cta: secondaryCta,
      tone, layout_style: layout, motion_level: motion,
      notes: clampString(notes, 500), sections,
    });

    try {
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(site_spec),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      alert("Site generated. Check backend/site_out for files.");
      console.log("API response:", data);
    } catch (e: any) {
      alert(`Error: ${e?.message || e}`);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="app-container">
        <h1 className="scroll-m-20 font-extrabold tracking-tight page-title">
          AI Website Builder
        </h1>

        {/* BASICS */}
        <Card className="mb-4 mt-8">
          <CardHeader className="pb-2">
            <CardTitle className="scroll-m-20 text-3xl font-semibold tracking-tight">Basics</CardTitle>
            <CardDescription className="text-muted-foreground">
              Brand, tagline & quick visual choices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-8">
              <InlineField label="Brand">
                <Input placeholder="e.g. Nebula Metrics" value={brand} onChange={(e) => setBrand(e.target.value)} />
              </InlineField>
              <InlineField label="Tagline">
                <Input placeholder="Short, punchy value proposition" value={tagline} onChange={(e) => setTagline(e.target.value)} />
              </InlineField>
              <InlineField label="Theme">
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger><SelectValue placeholder="Pick a theme" /></SelectTrigger>
                  <SelectContent>{THEMES.map((t) => (<SelectItem key={t} value={t}>{t.replaceAll("_"," ")}</SelectItem>))}</SelectContent>
                </Select>
              </InlineField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-8">
              <InlineField label="Color palette">
                <Select value={palette} onValueChange={setPalette}>
                  <SelectTrigger><SelectValue placeholder="Choose colors" /></SelectTrigger>
                  <SelectContent>{COLOR_PALETTES.map((p) => (<SelectItem key={p} value={p}>{p.replaceAll("_"," ")}</SelectItem>))}</SelectContent>
                </Select>
              </InlineField>
              <InlineField label="Primary CTA">
                <Select value={primaryCta} onValueChange={setPrimaryCta}>
                  <SelectTrigger><SelectValue placeholder="Select primary CTA" /></SelectTrigger>
                  <SelectContent>{CTA_OPTIONS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                </Select>
              </InlineField>
              <InlineField label="Secondary CTA">
                <Select value={secondaryCta} onValueChange={setSecondaryCta}>
                  <SelectTrigger><SelectValue placeholder="Select secondary CTA" /></SelectTrigger>
                  <SelectContent>{CTA_OPTIONS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent>
                </Select>
              </InlineField>
            </div>
          </CardContent>
        </Card>

        {/* SECTIONS – split control + drag/reorder */}
        <Card className="mb-4">
          <CardHeader className="pb-2 flex flex-row items-start justify-between">
            <div>
              <CardTitle className="scroll-m-20 text-3xl font-semibold tracking-tight">Choose your Website's Sections</CardTitle>
              <CardDescription className="text-muted-foreground">
                Click a section to turn on/off. Drag to reorder.
              </CardDescription>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="flex items-center justify-center w-6 h-6 rounded-full text-primary-foreground hover:opacity-90"
                  style={{ background: "linear-gradient(90deg, hsl(var(--primary) / 0.85), hsl(var(--primary)))" }}
                  aria-label="Help"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="left"
                className="max-w-xs"
                style={{
                  background: "linear-gradient(90deg, hsl(var(--primary) / 0.85), hsl(var(--primary)))",
                  color: "hsl(var(--primary-foreground))",
                  border: "1px solid hsl(var(--primary))",
                }}
              >
                Toggle sections by clicking. Drag rows to reorder. Turned-off sections appear gray. Header stays at the top; Footer stays at the bottom.
              </TooltipContent>
            </Tooltip>
          </CardHeader>

          <CardContent className="space-y-3">
            {order.map((id, i) => {
              const s = ALL_SECTIONS.find((x) => x.id === id)!;
              const isOn = enabledSet.has(id);
              const isFixed = FIXED.has(id);
              return (
                <SectionRow
                  key={id}
                  id={id}
                  label={s.label}
                  idx={i}
                  count={order.length}
                  isOn={isOn}
                  isFixed={isFixed}
                  onMove={move}
                  onToggle={toggleSection}
                  onDragStart={onDragStartRow}
                  onDragOverRow={onDragOverRow}
                  onDropRow={onDropRow}
                />
              );
            })}
          </CardContent>
        </Card>

        {/* ADVANCED */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="scroll-m-20 text-3xl font-semibold tracking-tight">Advanced</CardTitle>
            <CardDescription className="text-muted-foreground">Tone, layout & motion</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-8">
              <InlineField label="Tone">
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger><SelectValue placeholder="Pick tone" /></SelectTrigger>
                  <SelectContent>{TONE.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
                </Select>
              </InlineField>
              <InlineField label="Layout">
                <Select value={layout} onValueChange={setLayout}>
                  <SelectTrigger><SelectValue placeholder="Pick layout" /></SelectTrigger>
                  <SelectContent>{LAYOUT.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
                </Select>
              </InlineField>
              <InlineField label="Motion">
                <Select value={motion} onValueChange={setMotion}>
                  <SelectTrigger><SelectValue placeholder="Choose motion" /></SelectTrigger>
                  <SelectContent>{MOTION.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}</SelectContent>
                </Select>
              </InlineField>
            </div>
          </CardContent>
        </Card>

        {/* NOTES + SUBMIT */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="scroll-m-20 text-3xl font-semibold tracking-tight">Additional notes</CardTitle>
            <CardDescription className="text-muted-foreground">Optional free-form guidance (max 500 chars)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <Label className="w-24 shrink-0 text-base font-semibold leading-none mt-1.5">Notes</Label>
              <div className="flex-1">
                <Textarea
                  placeholder="Details about tone, target audience, copy constraints, etc."
                  value={notes}
                  onChange={(e) => setNotes(clampString(e.target.value, 500))}
                  rows={6}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">

<Button
  className="px-10 py-8 text-lg leading-none"   // unchanged size
  onClick={onGenerate}
  disabled={isGenerating}
  aria-busy={isGenerating}
>
  {isGenerating ? (
    <span className="inline-flex items-center gap-2">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="btn-text-scale">Generating…</span>
    </span>
  ) : (
    <span className="btn-text-scale">Generate Website</span>
  )}
</Button>



            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
