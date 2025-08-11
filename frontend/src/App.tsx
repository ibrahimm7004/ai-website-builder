import { useMemo, useState } from "react";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

// icons
import { ChevronUp, ChevronDown, HelpCircle } from "lucide-react";

// ---------------- types / constants ----------------
type SectionKey =
  | "nav"
  | "hero"
  | "features"
  | "social_proof"
  | "deep_dive"
  | "pricing"
  | "faq"
  | "cta_final"
  | "footer";

const ALL_SECTIONS: { id: SectionKey; label: string }[] = [
  { id: "nav",          label: "Header / Nav" },
  { id: "hero",         label: "Hero" },
  { id: "features",     label: "Features" },
  { id: "social_proof", label: "Social Proof" },
  { id: "deep_dive",    label: "Deep Dive" },
  { id: "pricing",      label: "Pricing" },
  { id: "faq",          label: "FAQ" },
  { id: "cta_final",    label: "Final CTA" },
  { id: "footer",       label: "Footer" },
];

const THEMES = ["modern_saas", "minimal", "playful", "elegant", "industrial"] as const;

const COLOR_PALETTES = ["indigo_pink", "blue_cyan", "violet_fuchsia", "slate_amber", "emerald_lime"] as const;

const CTA_OPTIONS = ["Start Free", "Request Demo", "Get Started", "Contact Sales"] as const;

const TONE = ["formal", "playful"] as const;
const LAYOUT = ["split", "centered"] as const;
const MOTION = ["none", "light"] as const;

// ---------------- helpers ----------------
function InlineField(props: { label: string; children: React.ReactNode }) {
  // Labels closer to controls; consistent, compact row
  return (
    <div className="flex items-center gap-1.5">
      <Label className="w-24 shrink-0 text-sm text-muted-foreground leading-none">
        {props.label}
      </Label>
      <div className="flex-1">{props.children}</div>
    </div>
  );
}

function clampString(s: string, max = 500) {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

function pruneEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  (Object.keys(obj) as (keyof T)[]).forEach((k) => {
    const v = obj[k];
    if (v !== "" && v !== null && v !== undefined) {
      out[k] = v;
    }
  });
  return out;
}

// ---------------- main ----------------
export default function App() {
  // basics
  const [brand, setBrand] = useState("");
  const [tagline, setTagline] = useState("");

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
    ALL_SECTIONS.map((s) => s.id)
  );
  const [order, setOrder] = useState<SectionKey[]>(
    ALL_SECTIONS.map((s) => s.id)
  );

  const enabledSet = useMemo(() => new Set(enabledSections), [enabledSections]);

  function move(id: SectionKey, dir: -1 | 1) {
    setOrder((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(j, 0, item);
      return next;
    });
  }

  function toggleSection(id: SectionKey) {
    setEnabledSections((prev) => {
      const isOn = prev.includes(id);
      // turn OFF: remove from enabled and push to bottom of order
      if (isOn) {
        setOrder((o) => {
          const idx = o.indexOf(id);
          if (idx === -1) return o;
          const next = [...o];
          next.splice(idx, 1);
          next.push(id);
          return next;
        });
        return prev.filter((x) => x !== id);
      }
      // turn ON: add back (keep current order position)
      return [...prev, id];
    });
  }

  async function onGenerate() {
    const sections = order.map((id) => ({
      id,
      enabled: enabledSet.has(id),
    }));

    const site_spec = pruneEmpty({
      brand,
      tagline,
      theme,
      color_palette: palette,
      primary_cta: primaryCta,
      secondary_cta: secondaryCta,
      tone,
      layout_style: layout,
      motion_level: motion,
      notes: clampString(notes, 500),
      sections,
    });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(site_spec),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Request failed");
      }

      const data = await res.json();
      alert("Site generated. Check backend/site_out for files.");
      console.log("API response:", data);
    } catch (e: any) {
      alert(`Error: ${e?.message || e}`);
    }
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="app-container">
        {/* H1 using shadcn typography scale, bolder */}
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl page-title">
          AI Website Builder
        </h1>

        {/* BASICS */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle>Basics</CardTitle>
            <CardDescription className="text-muted-foreground">
              Brand, tagline & quick visual choices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* row: brand / tagline / theme */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-8">
              <InlineField label="Brand">
                <Input
                  placeholder="e.g. Nebula Metrics"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </InlineField>

              <InlineField label="Tagline">
                <Input
                  placeholder="Short, punchy value proposition"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                />
              </InlineField>

              <InlineField label="Theme">
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {THEMES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineField>
            </div>

            {/* row: palette / primary / secondary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-8">
              <InlineField label="Color palette">
                <Select value={palette} onValueChange={setPalette}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose colors" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_PALETTES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.replaceAll("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineField>

              <InlineField label="Primary CTA">
                <Select value={primaryCta} onValueChange={setPrimaryCta}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary CTA" />
                  </SelectTrigger>
                  <SelectContent>
                    {CTA_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineField>

              <InlineField label="Secondary CTA">
                <Select value={secondaryCta} onValueChange={setSecondaryCta}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select secondary CTA" />
                  </SelectTrigger>
                  <SelectContent>
                    {CTA_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineField>
            </div>
          </CardContent>
        </Card>

        {/* SECTIONS (toggle + reorder in one list) */}
        <Card className="mb-4">
          <CardHeader className="pb-2 flex flex-row items-start justify-between">
            <div>
              <CardTitle>Sections</CardTitle>
              <CardDescription className="text-muted-foreground">
                Click a row to toggle (off moves to bottom). Use arrows to reorder.
              </CardDescription>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border"
                  aria-label="Help"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                Toggle a section on/off and reorder the selected ones. Off items appear gray and move to the bottom.
              </TooltipContent>
            </Tooltip>
          </CardHeader>

          <CardContent className="space-y-2">
            {order.map((id) => {
              const s = ALL_SECTIONS.find((x) => x.id === id)!;
              const idx = order.indexOf(id);
              const isOn = enabledSet.has(id);

              return (
                <div
                  key={id}
                  role="switch"
                  aria-checked={isOn}
                  onClick={() => toggleSection(id)}
                  className={[
                    "flex items-center justify-between rounded-md border px-3 py-2 transition-colors cursor-pointer select-none",
                    isOn
                      ? "bg-card border-border hover:bg-accent/10"
                      : "bg-muted border-muted hover:bg-muted/80"
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm ${
                        isOn ? "text-foreground" : "text-muted-foreground line-through"
                      }`}
                    >
                      {s.label} {!isOn && <span className="ml-1">(off)</span>}
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()} // keep row click for toggle; arrows only move
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => move(id, -1)}
                      disabled={idx === 0}
                      title="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => move(id, +1)}
                      disabled={idx === order.length - 1}
                      title="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* ADVANCED */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle>Advanced</CardTitle>
            <CardDescription className="text-muted-foreground">
              Tone, layout & motion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-8">
              <InlineField label="Tone">
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineField>

              <InlineField label="Layout">
                <Select value={layout} onValueChange={setLayout}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick layout" />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineField>

              <InlineField label="Motion">
                <Select value={motion} onValueChange={setMotion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose motion" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTION.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InlineField>
            </div>
          </CardContent>
        </Card>

        {/* NOTES + SUBMIT */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle>Additional notes</CardTitle>
            <CardDescription className="text-muted-foreground">
              Optional free-form guidance (max 500 chars)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Top-aligned, bolder Notes label next to textarea */}
            <div className="flex items-start gap-2">
              <Label className="w-24 shrink-0 text-base font-semibold leading-none self-start">
                Notes
              </Label>
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
              <Button className="px-6" size="lg" onClick={onGenerate}>
                Generate landing page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
