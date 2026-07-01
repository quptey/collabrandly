const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const svgPath = path.join(rootDir, "public", "logo.svg");

async function generate() {
  const svgBuffer = fs.readFileSync(svgPath);

  // Need to add white background since logo.svg has no fill
  const svgWithBg = svgBuffer
    .toString()
    .replace(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">\n  <rect width="100" height="100" fill="#ffffff" />',
    );

  await sharp(Buffer.from(svgWithBg))
    .resize(1254, 1254)
    .png()
    .toFile(path.join(rootDir, "public", "logo.png"));

  console.log("Regenerated logo.png (1254x1254, non-circular)");
}

generate().catch(console.error);
