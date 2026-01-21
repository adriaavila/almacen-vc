import sharp from 'sharp';
import { existsSync } from 'fs';
import { join } from 'path';

const sizes = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' }, // Apple requires 180x180
  { size: 32, name: 'favicon-32x32.png' },
  { size: 16, name: 'favicon-16x16.png' },
];

const inputLogo = join(process.cwd(), 'public', 'logo-vistacampo.png');
const outputDir = join(process.cwd(), 'public');

async function generateIcons() {
  // Check if logo exists
  if (!existsSync(inputLogo)) {
    console.error(`Logo not found at: ${inputLogo}`);
    process.exit(1);
  }

  console.log('Generating icons from logo...');

  for (const { size, name } of sizes) {
    try {
      // Read the logo and get its metadata
      const metadata = await sharp(inputLogo).metadata();
      const logoWidth = metadata.width || 500;
      const logoHeight = metadata.height || 206;

      // Calculate scaling to fit within square while maintaining aspect ratio
      const scale = Math.min(size / logoWidth, size / logoHeight) * 0.9; // 0.9 to add some padding
      const scaledWidth = Math.round(logoWidth * scale);
      const scaledHeight = Math.round(logoHeight * scale);

      // Calculate position to center the logo
      const left = Math.round((size - scaledWidth) / 2);
      const top = Math.round((size - scaledHeight) / 2);

      // Create square icon with white background and centered logo
      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .composite([
          {
            input: await sharp(inputLogo)
              .resize(scaledWidth, scaledHeight, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 },
              })
              .toBuffer(),
            left,
            top,
          },
        ])
        .png()
        .toFile(join(outputDir, name));

      console.log(`✓ Generated ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Failed to generate ${name}:`, error);
    }
  }

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch((error) => {
  console.error('Error generating icons:', error);
  process.exit(1);
});
