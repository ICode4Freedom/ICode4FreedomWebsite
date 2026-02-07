// Series Definitions
// Add new series here, then add the series slug to blog post frontmatter

export interface Series {
  slug: string;
  name: string;
  description: string;
}

export const series: Series[] = [
  {
    slug: "japan",
    name: "Japan Series",
    description: "My journey studying abroad in Japan for 3 months and the lessons I brought home."
  },
  {
    slug: "life-lessons",
    name: "Life Lessons",
    description: "Reflections on growth, relationships, and navigating life's challenges."
  }
];

export function getSeriesBySlug(slug: string): Series | undefined {
  return series.find(s => s.slug === slug);
}
