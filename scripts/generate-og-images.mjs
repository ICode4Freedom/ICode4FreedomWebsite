import sharp from 'sharp';
import { readFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Ensure output directory exists
const outputDir = 'public/og';
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Read all blog posts
const blogsDir = 'src/pages/blogs';
const blogFiles = readdirSync(blogsDir).filter(f => f.endsWith('.md'));

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  
  const fm = {};
  match[1].split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      fm[key.trim()] = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
    }
  });
  return fm;
}

function createSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function wrapText(text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);
  
  return lines.slice(0, 3); // Max 3 lines
}

async function generateOgImage(title, slug, description = '') {
  const width = 1200;
  const height = 630;
  
  const wrappedTitle = wrapText(title, 35);
  const titleY = wrappedTitle.length === 1 ? 300 : wrappedTitle.length === 2 ? 260 : 220;
  const lineHeight = 70;
  
  const titleLines = wrappedTitle.map((line, i) => 
    `<text x="600" y="${titleY + i * lineHeight}" text-anchor="middle" class="title">${escapeXml(line)}</text>`
  ).join('\n    ');

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .title { font-family: 'Courier New', monospace; font-size: 52px; font-weight: bold; fill: #00ff00; }
      .site { font-family: 'Courier New', monospace; font-size: 28px; fill: #666; }
      .tagline { font-family: 'Courier New', monospace; font-size: 24px; fill: #888; }
      .prompt { font-family: 'Courier New', monospace; font-size: 20px; fill: #444; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="#1e2124"/>
  
  <!-- Scanlines effect -->
  ${Array.from({length: 63}, (_, i) => 
    `<rect x="0" y="${i * 10}" width="100%" height="1" fill="rgba(0,0,0,0.15)"/>`
  ).join('\n  ')}
  
  <!-- Border box -->
  <rect x="60" y="60" width="1080" height="510" fill="none" stroke="#00ff00" stroke-width="2" rx="4"/>
  <rect x="60" y="60" width="1080" height="510" fill="rgba(0,255,0,0.02)"/>
  
  <!-- Terminal header -->
  <rect x="60" y="60" width="1080" height="35" fill="#2a2a2a"/>
  <circle cx="85" cy="77" r="6" fill="#ff5f56"/>
  <circle cx="105" cy="77" r="6" fill="#ffbd2e"/>
  <circle cx="125" cy="77" r="6" fill="#27ca40"/>
  <text x="600" y="83" text-anchor="middle" class="prompt">icode4freedom.com</text>
  
  <!-- Title -->
  ${titleLines}
  
  <!-- Site name -->
  <text x="600" y="520" text-anchor="middle" class="site">[ICode4Freedom]</text>
  
  <!-- Cursor -->
  <text x="1100" y="550" class="prompt">_</text>
</svg>
`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(outputDir, `${slug}.png`));
  
  console.log(`✓ Generated: ${slug}.png`);
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Generate images for all blog posts
async function main() {
  console.log('Generating OG images...\n');
  
  for (const file of blogFiles) {
    const content = readFileSync(join(blogsDir, file), 'utf-8');
    const fm = extractFrontmatter(content);
    
    if (fm.title) {
      const slug = createSlug(fm.title);
      await generateOgImage(fm.title, slug, fm.description || '');
    }
  }
  
  console.log('\n✓ All OG images generated!');
}

main().catch(console.error);
