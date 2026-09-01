import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        destinations: resolve(__dirname, 'destinations.html'),
        packages: resolve(__dirname, 'packages.html'),
        'package-detail': resolve(__dirname, 'package-detail.html'),
        customize: resolve(__dirname, 'customize.html'),
        about: resolve(__dirname, 'about.html'),
        blog: resolve(__dirname, 'blog.html'),
        contact: resolve(__dirname, 'contact.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
});
