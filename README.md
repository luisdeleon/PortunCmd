# PortunCmd

A Vue 3 admin template built with Vite, Vuetify, and TypeScript.

## Overview

PortunCmd is a modern admin dashboard template featuring:
- Vue 3 with Composition API
- Vuetify 3 for UI components
- TypeScript for type safety
- Vertical navigation layout
- Vite for fast development and building
- Supabase integration for backend services

## Documentation

Additional setup and development documentation is available in the [`/docs`](./docs/) folder:

- [Getting Started](./docs/GETTING_STARTED.md) - Setup and development guide
- [Authentication](./docs/AUTHENTICATION.md) - Authentication setup and user management
- [Supabase Schema](./docs/SUPABASE_SCHEMA.md) - Database schema documentation
- [Supabase Usage](./docs/SUPABASE_USAGE.md) - How to use Supabase in your application

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- pnpm (package manager)
- Supabase project (for backend services)

### Environment Setup

1. Copy `.env.example` to `.env`:
```sh
cp .env.example .env
```

2. Add your Supabase credentials to `.env`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation

```sh
pnpm install
```

### Development

```sh
pnpm dev
```

The development server will start at `http://localhost:5173`

### Build

```sh
pnpm build
```

## Project Structure

```
PortunCmd/
├── docs/                # Documentation
├── public/              # Static assets
├── src/
│   ├── @core/          # Core components and utilities
│   ├── @layouts/       # Layout components
│   ├── assets/         # Images, styles, etc.
│   ├── components/     # Shared components
│   ├── composables/    # Vue composables (including useSupabase)
│   ├── lib/            # Library configurations (Supabase client)
│   ├── layouts/        # Layout templates
│   ├── pages/          # Page components
│   ├── types/          # TypeScript type definitions
│   │   └── supabase/   # Supabase database types
│   └── views/          # View components
└── themeConfig.ts      # Theme configuration
```

## Features

- 🎨 Modern UI with Vuetify 3
- 📱 Responsive design
- 🌙 Dark mode support
- 🔐 Authentication pages
- 📊 Dashboard templates
- 📝 Form components
- 📋 Data tables
- 🎯 TypeScript support
- 🔌 Supabase integration with typed database schema
- 📊 13 database tables for property management and visitor access

## License

This project is private and proprietary.

## Author

Luis De Leon
