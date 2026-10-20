import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://zaddy.art',
  output: 'static',
  image: {
    domains: [],
  },
  build: {
    // Inline all CSS — removes every render-blocking stylesheet request.
    inlineStylesheets: 'always',
  },
});
