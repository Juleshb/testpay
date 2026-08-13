import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

const outputs = [
  { input: 'pwa-icon.svg', output: 'icons/icon-192.png', size: 192 },
  { input: 'pwa-icon.svg', output: 'icons/icon-512.png', size: 512 },
  { input: 'pwa-icon-maskable.svg', output: 'icons/icon-512-maskable.png', size: 512 },
  { input: 'pwa-icon.svg', output: 'apple-touch-icon.png', size: 180 },
];

async function generate() {
  if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });

  for (const item of outputs) {
    const inputPath = join(publicDir, item.input);
    const outputPath = join(publicDir, item.output);
    const svg = readFileSync(inputPath);

    await sharp(svg).resize(item.size, item.size).png().toFile(outputPath);
    console.log(`Generated ${item.output}`);
  }
}

generate().catch((err) => {
  console.error('PWA icon generation failed:', err);
  process.exit(1);
});
