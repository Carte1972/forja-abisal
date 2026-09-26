// Configuración de Remotion (Studio y render). Ver video/README.md.
import { Config } from '@remotion/cli/config';
import { findBrowser } from './scripts/find_browser';

// Sin navegador local, Remotion descargaría uno: scripts/render.ts lo comprueba antes.
const browser = findBrowser();
if (browser) Config.setBrowserExecutable(browser);

Config.setEntryPoint('./src/index.ts');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
Config.setCodec('h264');
Config.setCrf(18);
Config.setPixelFormat('yuv420p');
// Rango y espacio de color estándar de vídeo (como los clips), no el rango completo de los JPEG.
Config.setColorSpace('bt709');
Config.setAudioCodec('aac');
