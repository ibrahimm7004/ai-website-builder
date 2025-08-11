const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export type GenerateResp = {
  ok: true;
  dir: string;
  written: string[];
  manifest: any;
};

export async function generateSite(siteSpec: any): Promise<GenerateResp> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(siteSpec),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}
