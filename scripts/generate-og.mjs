import sharp from 'sharp';
import { writeFileSync } from 'fs';

// Create OG image (1200x630) with terminal aesthetic
const width = 1200;
const height = 630;

const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=VT323&amp;display=swap');
      .title { font-family: 'Courier New', monospace; font-size: 64px; font-weight: bold; fill: #00ff00; }
      .tagline { font-family: 'Courier New', monospace; font-size: 28px; fill: #dcdfe4; }
      .prompt { font-family: 'Courier New', monospace; font-size: 20px; fill: #666; }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="#1e2124"/>
  
  <!-- Border box -->
  <rect x="100" y="120" width="1000" height="390" fill="none" stroke="#00ff00" stroke-width="3" rx="4"/>
  <rect x="100" y="120" width="1000" height="390" fill="rgba(0,255,0,0.03)"/>
  
  <!-- Title -->
  <text x="600" y="280" text-anchor="middle" class="title">[ICode4Freedom]</text>
  
  <!-- Tagline -->
  <text x="600" y="380" text-anchor="middle" class="tagline">Chase the life you want. Build it with urgency.</text>
  
  <!-- Terminal prompt -->
  <text x="50" y="590" class="prompt">$ cat blog.md_</text>
  
  <!-- Decorative scan lines (subtle) -->
  ${Array.from({length: 63}, (_, i) => 
    `<rect x="0" y="${i * 10}" width="100%" height="1" fill="rgba(0,0,0,0.1)"/>`
  ).join('')}
</svg>
`;

sharp(Buffer.from(svg))
  .png()
  .toFile('public/og-default.png')
  .then(() => console.log('✓ Generated public/og-default.png'))
  .catch(err => console.error('Error:', err));
