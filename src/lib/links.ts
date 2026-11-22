import fs from 'node:fs/promises';
import path from 'node:path';

export interface Site {
  name: string;
  url: string;
  description?: string;
}

const FILE = () => path.join(process.cwd(), 'links.json');

const isSite = (value: unknown): value is Site => {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.name === 'string' && typeof v.url === 'string';
};

/** Read links.json on every request, so edits show up without a rebuild. */
export async function getSites(): Promise<Site[]> {
  let raw: string;
  try {
    raw = await fs.readFile(FILE(), 'utf8');
  } catch {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { sites?: unknown })?.sites)
      ? (parsed as { sites: unknown[] }).sites
      : [];

  return list.filter(isSite).map((site) => ({
    name: site.name,
    url: site.url,
    description: typeof site.description === 'string' ? site.description : undefined,
  }));
}
