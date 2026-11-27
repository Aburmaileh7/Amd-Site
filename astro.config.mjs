import { defineConfig } from 'astro/config';
// scopedStyleStrategy 'where': component styles add no extra specificity, so a site's own site.css
// (placed after them, at the top of <body>) can override them without !important.
export default defineConfig({ build: { inlineStylesheets: 'auto' }, compressHTML: true, scopedStyleStrategy: 'where' });
