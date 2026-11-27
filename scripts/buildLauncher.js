import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const assetsDirectory = resolve(root, 'public/assets');
const launcherDirectory = resolve(root, 'launcher');

const files = (await readdir(assetsDirectory, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.png'))
  .map((entry) => resolve(entry.parentPath, entry.name))
  .sort();
const assets = Object.fromEntries(await Promise.all(files.map(async (file) => [
  relative(assetsDirectory, file).split(sep).join('/'),
  'data:image/png;base64,' + (await readFile(file)).toString('base64'),
])));

// IIFE incluye Phaser y el juego. Una vez cargado no quedan imports ni
// peticiones de PNG que Chrome pueda bloquear al abrir un archivo local.
const result = await build({
  root,
  configFile: false,
  publicDir: false,
  define: { __SIGNED_AWAY_ASSETS__: JSON.stringify(assets) },
  build: {
    lib: { entry: resolve(root, 'src/main.js'), name: 'SignedAwayGame', formats: ['iife'] },
    minify: true,
    write: false,
    chunkSizeWarningLimit: 1500,
  },
});
const output = Array.isArray(result) ? result.flatMap((item) => item.output) : result.output;
if (output.length !== 1 || output[0].type !== 'chunk') {
  throw new Error('El lanzador debe contener exactamente un script.');
}

// El HTML lee este formato fijo desde GitHub y puede cargarlo como script
// clásico desde una copia local. Comprimimos también el archivo de respaldo
// para que el repositorio y la descarga tengan un tamaño parecido.
const archive = gzipSync(output[0].code, { level: 9 }).toString('base64');
const script = `/* Generado por npm run build:launcher. */\nglobalThis.signedAwayArchive = "${archive}";\n`;
await mkdir(launcherDirectory, { recursive: true });
await writeFile(resolve(launcherDirectory, 'signed-away.js'), script);
console.log(`Paquete portátil generado con ${files.length} PNG (${Buffer.byteLength(script)} bytes).`);
