import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
await sharp(await readFile(new URL('../public/social.svg', import.meta.url)))
  .png()
  .toFile(
    new URL('../public/social.png', import.meta.url).pathname.replace(
      /^\/([A-Za-z]:)/,
      '$1',
    ),
  );
