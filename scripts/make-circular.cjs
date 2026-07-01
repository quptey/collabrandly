const sharp = require("sharp");
const path = require("path");

async function makeCircular(inputPath, outputPath, size) {
  const img = sharp(inputPath);
  const metadata = await img.metadata();
  const s = size || Math.min(metadata.width, metadata.height);

  const svgMask = Buffer.from(
    `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
      <circle cx="${s / 2}" cy="${s / 2}" r="${s / 2}" fill="white" />
    </svg>`,
  );

  await img
    .resize(s, s, { fit: "cover" })
    .composite([{ input: svgMask, blend: "dest-in" }])
    .png()
    .toFile(outputPath);

  console.log("Generated:", outputPath);
}

const publicDir = path.resolve(__dirname, "..", "public");

async function main() {
  const src = path.join(publicDir, "logo.png");
  const tmp = path.join(publicDir, "logo-tmp.png");

  await makeCircular(src, tmp, 512);
  await sharp(tmp).toFile(src);
  await makeCircular(src, path.join(publicDir, "favicon.png"), 64);
  console.log("Done!");
}

main().catch(console.error);
