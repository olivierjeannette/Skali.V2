/**
 * Script pour générer les splash screens iOS depuis un fichier SVG source
 *
 * PRÉREQUIS:
 * npm install sharp --save-dev (déjà installé)
 *
 * USAGE:
 * node scripts/generate-splash.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SPLASH_DIR = path.join(__dirname, '../public/splash');
const ICONS_DIR = path.join(__dirname, '../public/icons');
const SOURCE_SVG = path.join(ICONS_DIR, 'icon.svg');

// Tailles des splash screens iOS (portrait)
const SPLASH_SIZES = [
  { width: 2048, height: 2732, name: 'apple-splash-2048-2732' }, // iPad Pro 12.9"
  { width: 1668, height: 2388, name: 'apple-splash-1668-2388' }, // iPad Pro 11"
  { width: 1536, height: 2048, name: 'apple-splash-1536-2048' }, // iPad Air, iPad 4th
  { width: 1290, height: 2796, name: 'apple-splash-1290-2796' }, // iPhone 14 Pro Max
  { width: 1179, height: 2556, name: 'apple-splash-1179-2556' }, // iPhone 14 Pro
  { width: 1170, height: 2532, name: 'apple-splash-1170-2532' }, // iPhone 12/13/14
  { width: 1125, height: 2436, name: 'apple-splash-1125-2436' }, // iPhone X/XS/11 Pro
  { width: 1242, height: 2688, name: 'apple-splash-1242-2688' }, // iPhone XS Max
  { width: 828, height: 1792, name: 'apple-splash-828-1792' },   // iPhone XR/11
  { width: 750, height: 1334, name: 'apple-splash-750-1334' },   // iPhone 8/SE
  { width: 640, height: 1136, name: 'apple-splash-640-1136' },   // iPhone SE 1st
];

// Couleur de fond du splash (même que le theme)
const BACKGROUND_COLOR = { r: 15, g: 23, b: 42, alpha: 1 }; // #0f172a (slate-900)

async function generateSplashScreens() {
  console.log('🖼️  Génération des splash screens iOS...\n');

  // Créer le dossier splash si nécessaire
  if (!fs.existsSync(SPLASH_DIR)) {
    fs.mkdirSync(SPLASH_DIR, { recursive: true });
  }

  // Vérifier que le SVG source existe
  if (!fs.existsSync(SOURCE_SVG)) {
    console.error('❌ Fichier source non trouvé:', SOURCE_SVG);
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(SOURCE_SVG);

  for (const size of SPLASH_SIZES) {
    const outputPath = path.join(SPLASH_DIR, `${size.name}.png`);

    // Taille de l'icône: environ 25% de la plus petite dimension
    const iconSize = Math.floor(Math.min(size.width, size.height) * 0.25);

    // Créer le fond
    const background = await sharp({
      create: {
        width: size.width,
        height: size.height,
        channels: 4,
        background: BACKGROUND_COLOR,
      },
    })
      .png()
      .toBuffer();

    // Redimensionner l'icône
    const icon = await sharp(svgBuffer)
      .resize(iconSize, iconSize)
      .png()
      .toBuffer();

    // Composer l'image (centrer l'icône sur le fond)
    const left = Math.floor((size.width - iconSize) / 2);
    const top = Math.floor((size.height - iconSize) / 2);

    await sharp(background)
      .composite([
        {
          input: icon,
          left,
          top,
        },
      ])
      .png()
      .toFile(outputPath);

    console.log(`   ✓ ${size.name}.png (${size.width}x${size.height})`);
  }

  console.log('\n✅ Tous les splash screens ont été générés!');
}

generateSplashScreens().catch(console.error);
