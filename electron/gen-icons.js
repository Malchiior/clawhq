const sharp = require('sharp')
const pngToIco = require('png-to-ico')
const fs = require('fs')
const path = require('path')

async function main() {
  const svgPath = path.join(__dirname, 'icon.svg')
  const svg = fs.readFileSync(svgPath)

  // Generate PNGs at various sizes
  const sizes = [16, 32, 48, 64, 128, 256, 512, 1024]
  for (const size of sizes) {
    await sharp(svg).resize(size, size).png().toFile(path.join(__dirname, `icon-${size}.png`))
    console.log(`Generated icon-${size}.png`)
  }

  // Copy 256 as main icon.png
  await sharp(svg).resize(256, 256).png().toFile(path.join(__dirname, 'icon.png'))
  console.log('Generated icon.png (256x256)')

  // Generate ICO from multiple sizes
  const icoSizes = [16, 32, 48, 256]
  const pngBuffers = icoSizes.map(s => fs.readFileSync(path.join(__dirname, `icon-${s}.png`)))
  const ico = await pngToIco(pngBuffers)
  fs.writeFileSync(path.join(__dirname, 'icon.ico'), ico)
  console.log('Generated icon.ico')

  // Cleanup intermediate files
  for (const size of sizes) {
    if (!icoSizes.includes(size) && size !== 256 && size !== 1024) {
      fs.unlinkSync(path.join(__dirname, `icon-${size}.png`))
    }
  }

  console.log('Done!')
}

main().catch(console.error)
