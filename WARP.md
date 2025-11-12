# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands and workflows

Package manager: pnpm

- Install deps: pnpm install
- Dev server: pnpm dev
  - With LAN access: pnpm dev --host
- Build: pnpm build
- Preview production build: pnpm preview
- Typecheck: pnpm typecheck
- Lint (ESLint with auto-fix): pnpm lint
- Icon generation (Iconify): pnpm build:icons
- Initialize MSW service worker (usually run on postinstall): pnpm msw:init

Tests: no test runner is configured in package.json (no Jest/Vitest/Cypress config present).

Environment

- Copy .env.example to .env, then set:
  - VITE_SUPABASE_URL=https://your-project.supabase.co
  - VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

See docs/SETUP_GUIDE.md and docs/AUTHENTICATION.md for required Supabase URL/redirect configuration and email template.

## High-level architecture and structure

This is a Vue 3 + TypeScript + Vite application with Vuetify UI, Pinia state, file-based routing, i18n, and Supabase. The project favors plugin-based bootstrapping and strong typing.

Entry and boot

- src/main.ts creates the app, imports global styles, and calls registerPlugins(app) (from @core/utils/plugins) to wire up Router, Pinia, Vuetify, i18n, etc., then mounts #app.
- src/App.vue wraps the app in VApp and VLocaleProvider, reads Vuetify theme, renders <RouterView/>, and includes a ScrollToTop utility.

Routing

- File-based routing via unplugin-vue-router and vite-plugin-vue-meta-layouts
  - Route name normalization to kebab-case is configured in vite.config.ts
  - Layouts are applied recursively via setupLayouts in src/plugins/1.router/index.ts
  - Additional routes/redirects live in src/plugins/1.router/additional-routes.ts
- Navigation guards (src/plugins/1.router/guards.ts)
  - Public routes: to.meta.public bypasses auth checks
  - Auth detection: prefers cookies (userData, accessToken) for responsiveness; Supabase session is verified asynchronously in the background
  - unauthenticatedOnly pages redirect logged-in users to '/'
  - If not logged in, redirect to { name: 'login', query: { to: originalPath } }
  - Authorization: canNavigate(from @layouts/plugins/casl) gates access; failures route to { name: 'not-authorized' }

State management

- Pinia store registered in src/plugins/2.pinia.ts; store exported as store for direct usage when needed.

UI and theming

- Vuetify configured in src/plugins/vuetify/index.ts
  - Themes merged from static theme definitions and cookie-stored overrides (cookieRef for primary colors)
  - i18n adapter bridges Vuetify and vue-i18n
  - Component aliases (e.g., IconBtn→VBtn) and lab components are registered

Internationalization

- src/plugins/i18n/index.ts creates a vue-i18n instance
  - Locales are loaded eagerly from src/plugins/i18n/locales/*.json via import.meta.glob
  - Active locale defaults from cookieRef('language', themeConfig.app.i18n.defaultLocale) with fallback 'en'

Mock API for development

- MSW (Mock Service Worker) in src/plugins/fake-api/index.ts aggregates many handler groups under @db/*
  - On start, worker.start() registers the service worker at BASE_URL/mockServiceWorker.js
  - package.json sets msw.workerDirectory to public for correct placement; run pnpm msw:init when needed

Supabase integration

- Supabase client in src/lib/supabase.ts
  - Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
  - If missing, logs a warning and instantiates a placeholder client so app doesn’t crash (auth features won’t work)
  - Types come from src/types/supabase (generated); use Tables, TablesInsert, TablesUpdate for type-safe queries

Layouts and navigation

- Layout components under src/layouts and src/@layouts; meta-layouts plugin applies layouts to pages automatically
- Navigation configs live under src/navigation/horizontal and src/navigation/vertical

Build and tooling

- Vite config (vite.config.ts)
  - Plugins: Vue, Vue JSX, Vuetify, Vue DevTools, unplugin-vue-router (file-based routes), vite-plugin-vue-meta-layouts (layouts), unplugin-auto-import, unplugin-vue-components, vue-i18n bundle plugin, svg loader
  - Route name conversion to kebab-case and custom route inserts for email app
  - Aliases: '@', '@themeConfig', '@core', '@layouts', '@images', '@styles', '@configured-variables', '@db', '@api-utils', '@/types'
  - Chunk size warning limit raised; vuetify excluded from optimizeDeps
- TypeScript config (tsconfig.json) aligns path aliases with Vite and includes typing for the route/meta-layouts virtual modules
- Linting: ESLint via .eslintrc.cjs (Vue 3, TS, import, promise, sonarjs, regexp, stylistic rules); Stylelint via .stylelintrc.json for styles

## Pointers to important docs in-repo

- README.md → Quick Start (pnpm, .env), commands, stack overview
- docs/SETUP_GUIDE.md → Supabase Site URL and Redirect URLs, email templates, production env variables
- docs/GETTING_STARTED.md → local development workflow and commands
- docs/AUTHENTICATION.md → auth flow, demo accounts, RBAC, cookie/session behavior
- docs/SUPABASE_SCHEMA.md and docs/SUPABASE_USAGE.md → schema and type-safe client usage patterns
- docs/CLOUDFLARE_SETUP.md → production deployment and auth email redirects
