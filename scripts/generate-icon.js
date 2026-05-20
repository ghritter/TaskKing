const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'src', 'renderer', 'assets', 'crown-logo.svg');
const assetsDir = path.join(__dirname, '..', 'src', 'renderer', 'assets');
const icoPath = path.join(assetsDir, 'icon.ico');
const png256Path = path.join(assetsDir, 'icon-256.png');

async function createIco(pngBuffers) {
  // ICO file format:
  // Header: 6 bytes (reserved=0, type=1 for ICO, count=N)
  // Directory entries: 16 bytes each
  // Image data: raw PNG data for each entry

  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * count;
  let dataOffset = headerSize + dirSize;

  // Build header
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);     // Reserved
  header.writeUInt16LE(1, 2);     // Type: 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  // Build directory entries and collect data
  const dirEntries = [];
  const sizes = [16, 32, 48, 256];

  for (let i = 0; i < count; i++) {
    const entry = Buffer.alloc(dirEntrySize);
    const size = sizes[i];
    entry.writeUInt8(size === 256 ? 0 : size, 0);  // Width (0 = 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1);  // Height (0 = 256)
    entry.writeUInt8(0, 2);                         // Color palette
    entry.writeUInt8(0, 3);                         // Reserved
    entry.writeUInt16LE(1, 4);                      // Color planes
    entry.writeUInt16LE(32, 6);                     // Bits per pixel
    entry.writeUInt32LE(pngBuffers[i].length, 8);   // Image data size
    entry.writeUInt32LE(dataOffset, 12);            // Offset to image data
    dirEntries.push(entry);
    dataOffset += pngBuffers[i].length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

async function generate() {
  const sizes = [16, 32, 48, 256];
  const pngBuffers = [];

  for (const size of sizes) {
    const buf = await sharp(svgPath)
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers.push(buf);
    console.log(`Generated ${size}x${size} PNG buffer`);
  }

  // Also save the 256px PNG for other uses
  fs.writeFileSync(png256Path, pngBuffers[3]);

  // Create ICO
  const icoBuffer = await createIco(pngBuffers);
  fs.writeFileSync(icoPath, icoBuffer);
  console.log('Generated ICO:', icoPath, `(${icoBuffer.length} bytes)`);
}

generate().catch(err => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
