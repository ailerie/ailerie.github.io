import rss from '@astrojs/rss';
import { getLiveCollection } from 'astro:content';

export async function GET(context: { site: URL }) {
  const { entries } = await getLiveCollection('posts');

  const posts = (entries ?? [])
    .filter((entry) => !entry.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: 'aileri',
    description: 'aileri',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description ?? '',
      link: `/${post.id}/`,
    })),
  });
}
