#!/usr/bin/env node
/**
 * Cross-posting script for Dev.to, Hashnode, and Medium
 * 
 * Usage: node scripts/cross-post.mjs <blog-number>
 * Example: node scripts/cross-post.mjs 3
 * 
 * Required environment variables:
 * - DEVTO_API_KEY: Get from https://dev.to/settings/extensions
 * - HASHNODE_API_KEY: Get from https://hashnode.com/settings/developer
 * - MEDIUM_TOKEN: Get from https://medium.com/me/settings
 * - HASHNODE_PUBLICATION_ID: Your Hashnode blog ID
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const blogNumber = process.argv[2];

if (!blogNumber) {
  console.log('Usage: node scripts/cross-post.mjs <blog-number>');
  console.log('Example: node scripts/cross-post.mjs 3');
  process.exit(1);
}

const blogPath = join('src/pages/blogs', `${blogNumber}.md`);
let content;

try {
  content = readFileSync(blogPath, 'utf-8');
} catch (e) {
  console.error(`Blog ${blogNumber} not found at ${blogPath}`);
  process.exit(1);
}

// Extract frontmatter
function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: {}, body: content };
  
  const fm = {};
  match[1].split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      // Handle arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      } else {
        value = value.replace(/^["']|["']$/g, '');
      }
      fm[key] = value;
    }
  });
  
  const body = content.slice(match[0].length).trim();
  return { frontmatter: fm, body };
}

const { frontmatter, body } = extractFrontmatter(content);
const canonicalUrl = `https://icode4freedom.com/blogs/${blogNumber}`;

console.log('\n📝 Cross-posting:', frontmatter.title);
console.log('Canonical URL:', canonicalUrl);
console.log('\n');

// Dev.to
async function postToDevTo() {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) {
    console.log('❌ Dev.to: DEVTO_API_KEY not set');
    return;
  }

  const tags = Array.isArray(frontmatter.tags) 
    ? frontmatter.tags.slice(0, 4) 
    : [];

  const article = {
    article: {
      title: frontmatter.title,
      body_markdown: body,
      published: true,
      canonical_url: canonicalUrl,
      tags: tags,
      description: frontmatter.description || ''
    }
  };

  try {
    const res = await fetch('https://dev.to/api/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(article)
    });

    if (res.ok) {
      const data = await res.json();
      console.log('✅ Dev.to:', data.url);
    } else {
      const err = await res.text();
      console.log('❌ Dev.to error:', err);
    }
  } catch (e) {
    console.log('❌ Dev.to error:', e.message);
  }
}

// Hashnode
async function postToHashnode() {
  const apiKey = process.env.HASHNODE_API_KEY;
  const pubId = process.env.HASHNODE_PUBLICATION_ID;
  
  if (!apiKey || !pubId) {
    console.log('❌ Hashnode: HASHNODE_API_KEY or HASHNODE_PUBLICATION_ID not set');
    return;
  }

  const query = `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        post {
          url
        }
      }
    }
  `;

  const tags = Array.isArray(frontmatter.tags) 
    ? frontmatter.tags.map(t => ({ name: t, slug: t.toLowerCase().replace(/\s+/g, '-') }))
    : [];

  const variables = {
    input: {
      title: frontmatter.title,
      contentMarkdown: body,
      publicationId: pubId,
      originalArticleURL: canonicalUrl,
      tags: tags.slice(0, 5)
    }
  };

  try {
    const res = await fetch('https://gql.hashnode.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey
      },
      body: JSON.stringify({ query, variables })
    });

    const data = await res.json();
    if (data.data?.createPost?.post?.url) {
      console.log('✅ Hashnode:', data.data.createPost.post.url);
    } else {
      console.log('❌ Hashnode error:', JSON.stringify(data.errors || data));
    }
  } catch (e) {
    console.log('❌ Hashnode error:', e.message);
  }
}

// Medium
async function postToMedium() {
  const token = process.env.MEDIUM_TOKEN;
  
  if (!token) {
    console.log('❌ Medium: MEDIUM_TOKEN not set');
    return;
  }

  try {
    // Get user ID first
    const userRes = await fetch('https://api.medium.com/v1/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const userData = await userRes.json();
    const userId = userData.data?.id;

    if (!userId) {
      console.log('❌ Medium: Could not get user ID');
      return;
    }

    const tags = Array.isArray(frontmatter.tags) 
      ? frontmatter.tags.slice(0, 5) 
      : [];

    const post = {
      title: frontmatter.title,
      contentFormat: 'markdown',
      content: body,
      canonicalUrl: canonicalUrl,
      tags: tags,
      publishStatus: 'public'
    };

    const res = await fetch(`https://api.medium.com/v1/users/${userId}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(post)
    });

    const data = await res.json();
    if (data.data?.url) {
      console.log('✅ Medium:', data.data.url);
    } else {
      console.log('❌ Medium error:', JSON.stringify(data.errors || data));
    }
  } catch (e) {
    console.log('❌ Medium error:', e.message);
  }
}

// Run all
async function main() {
  await postToDevTo();
  await postToHashnode();
  await postToMedium();
  console.log('\n✅ Cross-posting complete!\n');
}

main();
