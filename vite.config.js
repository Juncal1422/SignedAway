import { defineConfig } from 'vite';

// El HTML compilado usa rutas relativas para funcionar bajo /SignedAway/ y
// en cualquier subdirectorio que aloje el contenido de dist/.
export default defineConfig({
  base: './',
});
