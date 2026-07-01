const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const svgPath = path.join(rootDir, "public", "logo-icon.svg");
const outputDir = path.join(rootDir, "public");

const sizes = [16, 32, 48, 64, 180, 192, 512];

async function generate() {
  const svgBuffer = fs.readFileSync(svgPath);

  for (const size of sizes) {
    const name = size === 180 ? "apple-touch-icon" : `icon-${size}x${size}`;
    const ext = size === 180 || size === 192 || size === 512 ? "png" : "png";
    const filename = size === 180 ? "apple-touch-icon.png" : `${name}.${ext}`;

    await sharp(svgBuffer).resize(size, size).png().toFile(path.join(outputDir, filename));

    console.log(`Generated ${filename} (${size}x${size})`);
  }

  // Also generate favicon.ico (using 32x32 as source, embedded in multi-size)
  // Sharp doesn't support ico, so we'll just copy 32x32 and name it .ico
  // Browsers that need .ico will fall back to SVG

  // Copy as simple favicon png
  fs.copyFileSync(
    path.join(outputDir, "icon-32x32.png"),
    path.join(outputDir, "favicon-32x32.png"),
  );
  fs.copyFileSync(
    path.join(outputDir, "icon-16x16.png"),
    path.join(outputDir, "favicon-16x16.png"),
  );

  console.log("Done! All icons generated.");
}

generate().catch(console.error);
