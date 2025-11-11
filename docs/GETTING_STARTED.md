# Getting Started with PortunCmd

This guide will help you set up your development environment and start working with PortunCmd.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [IDE Setup](#ide-setup)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Development Workflow](#development-workflow)
- [Building for Production](#building-for-production)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Verify installation: `node --version`

2. **pnpm** (package manager)
   - Install: `npm install -g pnpm`
   - Verify installation: `pnpm --version`

3. **Git**
   - Download: https://git-scm.com/
   - Verify installation: `git --version`

### Recommended Software

- **VS Code** - Popular code editor with excellent Vue support
- **Vue DevTools** - Browser extension for debugging Vue applications

## IDE Setup

### Recommended IDE: Visual Studio Code

Download VS Code from [code.visualstudio.com](https://code.visualstudio.com/)

### Essential VS Code Extensions

Install these extensions for the best development experience:

1. **Vue Official** (formerly Volar)
   - Extension ID: `Vue.volar`
   - Provides Vue 3 support, syntax highlighting, and IntelliSense
   - **Important:** Disable Vetur if you have it installed (conflicts with Volar)

2. **TypeScript Vue Plugin (Volar)**
   - Extension ID: `Vue.vscode-typescript-vue-plugin`
   - Enables TypeScript support in `.vue` files

3. **ESLint**
   - Extension ID: `dbaeumer.vscode-eslint`
   - Linting and code quality

4. **Prettier** (optional)
   - Extension ID: `esbenp.prettier-vscode`
   - Code formatting

5. **Iconify IntelliSense**
   - Extension ID: `antfu.iconify`
   - Icon suggestions and preview

### VS Code Settings

Add these to your `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

## Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd PortunCmd
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all required packages defined in `package.json`.

### 3. Verify Installation

Check that everything is installed correctly:

```bash
# Check if node_modules exists
ls node_modules

# Verify TypeScript is installed
pnpm exec tsc --version

# Verify Vite is installed
pnpm exec vite --version
```

## Environment Configuration

### 1. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Configure Supabase

Open `.env` and add your Supabase credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Get Supabase Credentials

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project (or create one)
3. Navigate to **Settings** → **API**
4. Copy the following:
   - **Project URL** → Use as `VITE_SUPABASE_URL`
   - **anon public** key → Use as `VITE_SUPABASE_ANON_KEY`

> ⚠️ **Important:** Never commit the `.env` file to version control. It's already in `.gitignore`.

## Running the Application

### Start Development Server

```bash
pnpm dev
```

The application will start at `http://localhost:5173`

### Start with Network Access

To access the app from other devices on your network:

```bash
pnpm dev --host
```

This will display network URLs you can use from mobile devices or other computers.

### Preview Production Build

To test the production build locally:

```bash
pnpm build
pnpm preview
```

## Development Workflow

### Project Structure

```
src/
├── pages/           # File-based routing - each .vue file becomes a route
├── components/      # Reusable Vue components
├── composables/     # Vue composition functions (e.g., useAuth, useSupabase)
├── layouts/         # Layout components
├── plugins/         # Vue plugins (router, i18n, vuetify)
├── lib/             # Library configurations (Supabase client)
├── types/           # TypeScript type definitions
└── assets/          # Static assets (images, styles)
```

### File-Based Routing

This project uses `unplugin-vue-router` for automatic route generation:

- Create a file in `src/pages/` → Automatically becomes a route
- Example: `src/pages/dashboard.vue` → Route: `/dashboard`
- Example: `src/pages/users/[id].vue` → Route: `/users/:id`

### Creating a New Page

1. Create a new `.vue` file in `src/pages/`:

```vue
<!-- src/pages/my-page.vue -->
<script setup lang="ts">
definePage({
  meta: {
    layout: 'default', // or 'blank' for full-page layouts
  },
})

const title = ref('My New Page')
</script>

<template>
  <div>
    <h1>{{ title }}</h1>
    <p>This is a new page!</p>
  </div>
</template>
```

2. The route `/my-page` is automatically available
3. Navigate to `http://localhost:5173/my-page`

### Using Supabase

```vue
<script setup lang="ts">
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/supabase'

const profiles = ref<Tables<'profile'>[]>([])

async function fetchProfiles() {
  const { data, error } = await supabase
    .from('profile')
    .select('*')

  if (error) {
    console.error('Error:', error)
    return
  }

  profiles.value = data || []
}

onMounted(() => {
  fetchProfiles()
})
</script>

<template>
  <VCard>
    <VCardText>
      <div v-for="profile in profiles" :key="profile.id">
        {{ profile.email }}
      </div>
    </VCardText>
  </VCard>
</template>
```

### TypeScript Support

This project uses TypeScript for type safety. The Supabase database types are automatically generated and available:

```typescript
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase'

// Get the type for a table row
type Profile = Tables<'profile'>

// Get the type for inserting
type NewProfile = TablesInsert<'profile'>

// Get the type for updating
type ProfileUpdate = TablesUpdate<'profile'>
```

### Type Checking

Run TypeScript type checking:

```bash
pnpm typecheck
```

This uses `vue-tsc` instead of regular `tsc` to understand `.vue` files.

## Building for Production

### Build the Application

```bash
pnpm build
```

This will:
1. Run TypeScript type checking
2. Build optimized production files
3. Output to the `dist/` directory

### Output Structure

```
dist/
├── assets/          # Bundled JS, CSS, and assets
├── index.html       # Main HTML file
└── ...
```

### Deploy the Build

The `dist/` folder can be deployed to:
- **Cloudflare Pages** (recommended)
- **Vercel**
- **Netlify**
- **Any static hosting service**

See [Cloudflare Setup Guide](./CLOUDFLARE_SETUP.md) for deployment instructions.

## Troubleshooting

### Common Issues

#### Port 5173 is already in use

**Solution:** Either stop the other process or Vite will automatically use the next available port (5174, 5175, etc.)

```bash
# Find and kill process on port 5173 (macOS/Linux)
lsof -ti:5173 | xargs kill -9

# Or just let Vite use a different port
pnpm dev  # Will use 5174 if 5173 is busy
```

#### Module not found errors

**Solution:** Reinstall dependencies

```bash
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

#### TypeScript errors in `.vue` files

**Solution:** Make sure you have the Vue language tools installed:

1. Install VS Code extension: **Vue Official** (`Vue.volar`)
2. Disable **Vetur** if installed (conflicts with Volar)
3. Restart VS Code
4. Run `pnpm typecheck` to verify

#### Supabase connection errors

**Solution:** Check your `.env` file:

1. Verify `VITE_SUPABASE_URL` is correct
2. Verify `VITE_SUPABASE_ANON_KEY` is correct
3. Restart development server after changes
4. Check Supabase project is not paused

#### Build fails with TypeScript errors

**Solution:** Fix type errors before building

```bash
# Check for type errors
pnpm typecheck

# Fix errors in reported files
# Then build again
pnpm build
```

### Hot Module Replacement (HMR) not working

**Solution:**

1. Check file watcher limits (Linux):
   ```bash
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

2. Or restart the development server:
   ```bash
   # Press Ctrl+C to stop
   pnpm dev
   ```

### Vuetify components not styled correctly

**Solution:** Check that Vuetify is properly configured:

1. Verify `src/plugins/vuetify/index.ts` exists
2. Check `src/main.ts` imports the Vuetify plugin
3. Restart development server

## Next Steps

Now that you have the development environment set up:

1. 📘 Read the [Setup Guide](./SETUP_GUIDE.md) for Supabase configuration
2. 🔒 Review [Authentication Guide](./AUTHENTICATION.md) for user management
3. 💻 Check [Supabase Usage](./SUPABASE_USAGE.md) for code examples
4. 🗄️ Study [Supabase Schema](./SUPABASE_SCHEMA.md) to understand the database

## Useful Commands Reference

```bash
# Development
pnpm dev                  # Start dev server
pnpm dev --host           # Start with network access

# Building
pnpm build                # Build for production
pnpm preview              # Preview production build

# Type Checking
pnpm typecheck            # Check TypeScript types

# Dependencies
pnpm install              # Install dependencies
pnpm add <package>        # Add a new package
pnpm update               # Update dependencies

# Cleaning
rm -rf node_modules       # Remove node_modules
rm -rf dist               # Remove build output
pnpm install              # Reinstall everything
```

## Development Tips

### Hot Reload

Changes to `.vue` files, `.ts` files, and `.scss` files will automatically reload in the browser.

### Import Aliases

Use path aliases for cleaner imports:

```typescript
import { supabase } from '@/lib/supabase'      // src/lib/supabase.ts
import MyComponent from '@/components/MyComponent.vue'
import { useAuth } from '@/composables/useAuth'
```

### Vite Configuration

Customize Vite settings in `vite.config.ts` for:
- Build optimizations
- Plugin configuration
- Path aliases
- Proxy settings

### Vue DevTools

Install the Vue DevTools browser extension for debugging:
- Chrome: [Vue.js devtools](https://chrome.google.com/webstore/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
- Firefox: [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)

---

**Happy coding! 🚀**

For more help, check the other documentation files or contact the development team.
