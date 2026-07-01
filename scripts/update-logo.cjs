const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const svgPath = path.join(rootDir, "public", "logo-icon.svg");

async function generate() {
  const svgBuffer = fs.readFileSync(svgPath);

  // Update logo.png to circular version at original size (1254x1254)
  await sharp(svgBuffer)
    .resize(1254, 1254)
    .png()
    .toFile(path.join(rootDir, "public", "logo.png"));

  console.log("Updated logo.png (1254x1254, circular)");
}

generate().catch(console.error);
