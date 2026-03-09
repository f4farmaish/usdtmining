import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // if using React

export default defineConfig({
  plugins: [react()],
  base: './', // important for Netlify to serve scripts correctly
});