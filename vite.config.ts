import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// En GitHub Pages la app se sirve bajo /<nombre-del-repositorio>/.
// El workflow de despliegue define BASE_PATH automáticamente.
const base = process.env.BASE_PATH ?? '/Rural69/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
