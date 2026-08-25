import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import tailwindPostcss from '@tailwindcss/postcss';
import { tanstackRouter } from '@tanstack/router-plugin/rspack';

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: { index: './src/main.tsx' },
    alias: { '@': './src' },
  },
  html: { title: 'LoopzToken' },
  server: { port: 5173 },
  tools: {
    postcss: (_config, { addPlugins }) => {
      addPlugins(tailwindPostcss());
    },
    rspack: (config) => {
      // TanStack Router 文件路由：dev/build 时生成 src/routeTree.gen.ts
      config.plugins = config.plugins ?? [];
      config.plugins.push(
        tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      );
      return config;
    },
  },
  performance: {
    // 生产构建拆分 React 与 UI Vendor Chunk（UI_TECH_STACK 15）
    chunkSplit: {
      strategy: 'split-by-experience',
    },
  },
});
