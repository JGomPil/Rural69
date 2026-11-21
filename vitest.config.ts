import { defineConfig } from 'vitest/config'

// Configuración aparte de `vite.config.ts` a propósito: las pruebas son de
// lógica, no de pantallas, y así no hace falta montar React ni Tailwind para
// correrlas. Tardan menos de un segundo.
export default defineConfig({
  test: {
    include: ['src/**/*.prueba.ts'],
    environment: 'node',
    setupFiles: ['src/pruebas/entorno.ts'],
    // Las claves no se usan (nadie llama a Supabase en las pruebas), pero sin
    // ellas el cliente avisa por consola en cada archivo.
    env: {
      VITE_SUPABASE_URL: 'http://localhost',
      VITE_SUPABASE_ANON_KEY: 'clave-de-pruebas',
    },
  },
})
