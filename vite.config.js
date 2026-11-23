import { defineConfig } from 'vite';

const allowedHosts = [
  'image-generation--9ag8l213.preview.devinapps.com',
  'image-generation--ld6s4kr5.preview.devinapps.com',
];

export default defineConfig({
  server: { host: '0.0.0.0', allowedHosts },
  preview: { host: '0.0.0.0', port: 4173, strictPort: true, allowedHosts },
});
