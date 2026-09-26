import barlow500 from '@fontsource/barlow-condensed/files/barlow-condensed-latin-500-normal.woff2';
import barlow700 from '@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2';
import shoulders800 from '@fontsource/big-shoulders-display/files/big-shoulders-display-latin-800-normal.woff2';
import shoulders900 from '@fontsource/big-shoulders-display/files/big-shoulders-display-latin-900-normal.woff2';
import plex500 from '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2';
import { loadFont } from '@remotion/fonts';

/**
 * Tipografías de Google Fonts (licencia OFL) empaquetadas en npm con @fontsource: se cargan de
 * node_modules, sin pedir nada a internet. `loadFont` retrasa el render hasta que están listas.
 */
export function loadFonts(): void {
  const fonts = [
    { family: 'Big Shoulders Display', url: shoulders800, weight: '800' },
    { family: 'Big Shoulders Display', url: shoulders900, weight: '900' },
    { family: 'Barlow Condensed', url: barlow500, weight: '500' },
    { family: 'Barlow Condensed', url: barlow700, weight: '700' },
    { family: 'IBM Plex Mono', url: plex500, weight: '500' },
  ];
  for (const font of fonts) void loadFont({ ...font, format: 'woff2' });
}
