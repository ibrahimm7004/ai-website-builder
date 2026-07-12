const API_BASE = import.meta.env.VITE_API_BASE || "";

export type SectionId = "nav" | "hero" | "features" | "social_proof" | "deep_dive" | "pricing" | "faq" | "cta_final" | "footer";
export type SiteSpec = {
  brand: string; tagline?: string; business_description: string; target_audience?: string;
  primary_goal: string; differentiators: string[]; proof_points: string[];
  required_content?: string; reference_direction?: string; avoid_direction?: string;
  theme: string; color_palette?: string; tone: string; layout_style: string; motion_level: string;
  quality_tier: "draft" | "production" | "premium";
  primary_cta: string; primary_cta_url: string; secondary_cta?: string; secondary_cta_url?: string;
  sections: { id: SectionId; enabled: boolean }[]; notes?: string;
};
export type GeneratedFile = { path: "index.html" | "styles.css" | "script.js"; content: string };
export type CreativePlan = {
  concept_name: string; strategy: string; audience_insight: string; visual_direction: string;
  typography_direction: string; color_direction: string; hero_concept: string;
  conversion_strategy: string; section_plan: string[]; content_guardrails: string[];
};
export type GenerateResponse = {
  ok: true; generation_id: string; model: string; plan: CreativePlan; files: GeneratedFile[];
  quality: { score: number; checks: Record<string, boolean>; warnings: string[] };
};

export async function generateSite(siteSpec: SiteSpec, signal?: AbortSignal): Promise<GenerateResponse> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(siteSpec), signal,
  });
  const payload = await res.json().catch(() => ({ detail: res.statusText }));
  if (!res.ok) throw new Error(payload.detail || "Website generation failed");
  return payload;
}

export function createPreviewDocument(files: GeneratedFile[]): string {
  const map = Object.fromEntries(files.map((file) => [file.path, file.content]));
  const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src https: data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'">`;
  return map["index.html"]
    .replace(/<link[^>]+href=["']styles\.css["'][^>]*>/i, `<style>${map["styles.css"]}</style>`)
    .replace(/<script[^>]+src=["']script\.js["'][^>]*><\/script>/i, `<script>${map["script.js"]}</script>`)
    .replace(/<head([^>]*)>/i, `<head$1>${csp}`);
}
