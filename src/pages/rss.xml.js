import rss from '@astrojs/rss';

export async function GET(context) {
  // Import all blog posts
  const allPostsRaw = Object.values(import.meta.glob('./blogs/*.md', { eager: true }));
  
  // Filter out empty posts and sort by date
  const allPosts = allPostsRaw
    .filter((post) => post.rawContent && post.rawContent().trim().length > 0)
    .sort((a, b) => new Date(b.frontmatter.pubDate).getTime() - new Date(a.frontmatter.pubDate).getTime());

  return rss({
    title: 'ICode4Freedom',
    description: 'Building in public. Learning out loud. A blog about technology, philosophy, and life lessons from a first-year software engineer.',
    site: context.site,
    items: allPosts.map((post) => ({
      title: post.frontmatter.title,
      pubDate: new Date(post.frontmatter.pubDate),
      description: post.frontmatter.description,
      link: post.url,
      categories: post.frontmatter.tags || [],
    })),
    customData: `<language>en-us</language>`,
  });
}
