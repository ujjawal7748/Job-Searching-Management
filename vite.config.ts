import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.SUPABASE_URL': JSON.stringify(
        env.SUPABASE_URL || env.VITE_SUPABASE_URL,
      ),
      'import.meta.env.SUPABASE_ANON_KEY': JSON.stringify(
        env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY,
      ),
    },
  }
})
