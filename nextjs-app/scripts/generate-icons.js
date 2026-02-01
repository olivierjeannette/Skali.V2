/**
 * Script pour générer les icônes PWA depuis un fichier SVG source
 *
 * PRÉREQUIS:
 * npm install sharp --save-dev
 *
 * USAGE:
 * node scripts/generate-icons.js
 *
 * Note: Place ton logo personnalisé dans public/icons/icon.svg
 * Le script génère automatiquement toutes les tailles requises
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ICONS_DIR = path.join(__dirname, '../public/icons');
const SOURCE_SVG = path.join(ICONS_DIR, 'icon.svg');

// Tailles d'icônes requises pour PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [192, 512];

// Tailles pour les shortcuts
const SHORTCUT_ICONS = ['dashboard', 'planning', 'members'];

async function generateIcons() {
  console.log('🎨 Génération des icônes PWA...\n');

  // Vérifier que le SVG source existe
  if (!fs.existsSync(SOURCE_SVG)) {
    console.error('❌ Fichier source non trouvé:', SOURCE_SVG);
    console.log('   Crée un fichier icon.svg dans public/icons/');
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(SOURCE_SVG);

  // Générer les icônes standard
  console.log('📱 Génération des icônes standard...');
  for (const size of ICON_SIZES) {
    const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`   ✓ icon-${size}x${size}.png`);
  }

  // Générer les icônes maskable (avec padding pour safe zone)
  console.log('\n🎭 Génération des icônes maskable...');
  for (const size of MASKABLE_SIZES) {
    const outputPath = path.join(ICONS_DIR, `icon-maskable-${size}x${size}.png`);
    // Pour maskable, on ajoute un padding de 10% (safe zone)
    const iconSize = Math.floor(size * 0.8);
    const padding = Math.floor((size - iconSize) / 2);

    await sharp(svgBuffer)
      .resize(iconSize, iconSize)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 59, g: 130, b: 246, alpha: 1 } // #3b82f6
      })
      .png()
      .toFile(outputPath);
    console.log(`   ✓ icon-maskable-${size}x${size}.png`);
  }

  // Générer les icônes de shortcuts
  console.log('\n🔗 Génération des icônes shortcuts...');
  for (const shortcut of SHORTCUT_ICONS) {
    const outputPath = path.join(ICONS_DIR, `shortcut-${shortcut}.png`);
    await sharp(svgBuffer)
      .resize(96, 96)
      .png()
      .toFile(outputPath);
    console.log(`   ✓ shortcut-${shortcut}.png`);
  }

  // Générer le favicon
  console.log('\n🌐 Génération du favicon...');
  const faviconPath = path.join(__dirname, '../public/favicon.ico');
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(ICONS_DIR, 'favicon-32x32.png'));
  console.log('   ✓ favicon-32x32.png');

  // Apple touch icon
  const appleTouchPath = path.join(__dirname, '../public/apple-touch-icon.png');
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(appleTouchPath);
  console.log('   ✓ apple-touch-icon.png');

  console.log('\n✅ Toutes les icônes ont été générées!');
  console.log('\n📝 Note: Remplace public/icons/icon.svg par ton logo personnalisé');
  console.log('   puis relance ce script pour mettre à jour toutes les icônes.');
}

generateIcons().catch(console.error);
