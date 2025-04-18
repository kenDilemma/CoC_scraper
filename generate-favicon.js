import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import svg2png from 'svg2png';
import pngToIco from 'png-to-ico';

// Get the current directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 32, 48, 64, 128, 256];

async function generateFavicon() {
  try {
    console.log('Reading SVG file...');
    const svgBuffer = fs.readFileSync(path.join(__dirname, 'src/assets/favicon/favicon.svg'));
    
    // Create temporary directory for PNG files if it doesn't exist
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    
    // Generate PNG files for different sizes
    console.log('Generating PNG files...');
    const pngPaths = await Promise.all(sizes.map(async (size) => {
      const pngBuffer = await svg2png(svgBuffer, { width: size, height: size });
      const pngPath = path.join(tempDir, `favicon-${size}.png`);
      fs.writeFileSync(pngPath, pngBuffer);
      console.log(`Generated ${size}x${size} PNG`);
      return pngPath;
    }));
    
    // Convert PNGs to ICO
    console.log('Converting to ICO...');
    const icoBuffer = await pngToIco(pngPaths);
    
    // Write ICO file to public directory
    fs.writeFileSync(path.join(__dirname, 'public/favicon.ico'), icoBuffer);
    console.log('Favicon successfully generated at public/favicon.ico');
    
    // Clean up temporary files
    console.log('Cleaning up...');
    pngPaths.forEach(pngPath => fs.unlinkSync(pngPath));
    fs.rmdirSync(tempDir);
    
    console.log('Done!');
  } catch (err) {
    console.error('Error generating favicon:', err);
  }
}

generateFavicon();