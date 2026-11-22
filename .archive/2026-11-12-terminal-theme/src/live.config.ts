import { defineLiveCollection, z } from 'astro:content';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { renderMarkdoc } from './lib/render';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');

type Frontmatter = Record<string, unknown>;

const parseEntry = (raw: string) => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {} as Frontmatter, body: raw };
  return {
    data: (parseYaml(match[1]) ?? {}) as Frontmatter,
    body: match[2],
  };
};

const listFiles = async () => {
  try {
    const files = await fs.readdir(POSTS_DIR);
    return files.filter((file) => file.endsWith('.mdoc'));
  } catch {
    return [];
  }
};

const loadOne = async (id: string) => {
  const file = path.join(POSTS_DIR, `${id}.mdoc`);
  const raw = await fs.readFile(file, 'utf8');
  const { data, body } = parseEntry(raw);
  return {
    id,
    data,
    rendered: { html: renderMarkdoc(body) },
  };
};

const posts = defineLiveCollection({
  loader: {
    name: 'posts',
    async loadEntry({ filter }) {
      try {
        return await loadOne(filter.id);
      } catch {
        return undefined;
      }
    },
    async loadCollection() {
      const files = await listFiles();
      const entries = await Promise.all(
        files.map((file) => loadOne(file.replace(/\.mdoc$/, '')))
      );
      return { entries };
    },
  },
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
