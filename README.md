# PortunCmd

> A modern property management and visitor access control system built with Vue 3, Vuetify, and Supabase.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [License](#license)

## Overview

PortunCmd is a comprehensive admin dashboard and property management system designed for communities, condominiums, and properties. It provides robust visitor access control, multi-tenant architecture, and real-time automation features.

### Key Capabilities

- 🏘️ **Multi-Tenant Architecture** - Manage multiple communities and properties
- 🔐 **Secure Authentication** - Supabase-powered auth with role-based access control
- 📱 **Visitor Management** - QR code-based visitor access and tracking
- 🤖 **Automation** - Integration with IoT devices (Shelly) for access gates
- 📊 **Real-Time Dashboards** - Analytics and monitoring for property managers
- 🌍 **Multi-Language Support** - Built-in i18n (English, Spanish, Portuguese)
- 🎨 **Modern UI/UX** - Responsive design with light/dark mode

## Features

### 🎨 UI/UX
- Modern admin interface with Vuetify 3 components
- Responsive design for desktop, tablet, and mobile
- Dark mode support with theme persistence
- Customizable layouts and navigation

### 🔐 Authentication & Authorization
- Secure Supabase authentication
- Role-based access control (RBAC)
- Multiple user roles: Super Admin, Administrator, Guard, Resident, Dealer, Client
- Session management with cookie persistence

### 📊 Dashboard & Analytics
- CRM dashboard with real-time statistics
- Analytics dashboard with charts and metrics
- E-commerce dashboard for transactions
- Customizable dashboard widgets

### 🏘️ Property Management
- Multi-community support
- Property/unit management
- Owner and manager assignments
- Community hierarchies

### 👥 Visitor Access Control
- QR code generation for visitor access
- Time-based access permissions
- Entry/exit logging
- Document upload and verification
- Visitor type categorization

### 🤖 Automation & IoT
- Shelly device integration for gate control
- Automated access based on visitor records
- Real-time device control
- Geolocation-based automation

### 📱 Notifications
- Push notifications via OneSignal
- Email notifications via Supabase
- FCM (Firebase Cloud Messaging) support
- User-configurable notification preferences

## Documentation

Comprehensive guides are available in the [`/docs`](./docs/) folder:

### Essential Guides

- 📘 [Setup Guide](./docs/SETUP_GUIDE.md) - **Start here!** Complete setup instructions
- 🚀 [Getting Started](./docs/GETTING_STARTED.md) - Development environment setup
- 🔒 [Authentication](./docs/AUTHENTICATION.md) - User management and auth configuration
- 🌐 [Cloudflare Setup](./docs/CLOUDFLARE_SETUP.md) - Production deployment guide

### Technical Reference

- 🗄️ [Supabase Schema](./docs/SUPABASE_SCHEMA.md) - Complete database schema
- 💻 [Supabase Usage](./docs/SUPABASE_USAGE.md) - Code examples and patterns
- 🔐 [RBAC Guide](./docs/RBAC_GUIDE.md) - Role-based access control implementation guide

## Quick Start

### Prerequisites

- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **pnpm** package manager (`npm install -g pnpm`)
- **Supabase account** ([Sign up](https://supabase.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd PortunCmd
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   ```

   Update with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   > 💡 Find your credentials in Supabase Dashboard → Settings → API

4. **Start development server**
   ```bash
   pnpm dev
   ```

   The app will be available at `http://localhost:5173`

### Build for Production

```bash
pnpm build
```

The built files will be in the `dist` directory, ready for deployment.

## Project Structure

```
PortunCmd/
├── docs/                     # Documentation files
├── public/                   # Static assets
├── src/
│   ├── @core/               # Core components and utilities
│   ├── @layouts/            # Layout components
│   ├── assets/              # Images, styles, fonts
│   ├── components/          # Shared Vue components
│   ├── composables/         # Vue composables
│   │   ├── useAuth.ts      # Authentication logic
│   │   └── useValidators.ts # Form validation
│   ├── layouts/             # Layout templates
│   ├── lib/                 # Library configurations
│   │   └── supabase.ts     # Supabase client
│   ├── navigation/          # Navigation menus
│   ├── pages/               # Page components (file-based routing)
│   ├── plugins/             # Vue plugins
│   │   ├── 1.router/       # Router configuration
│   │   ├── casl/           # Authorization (CASL)
│   │   ├── i18n/           # Internationalization
│   │   └── vuetify/        # Vuetify configuration
│   ├── types/               # TypeScript type definitions
│   │   └── supabase/       # Generated Supabase types
│   ├── utils/               # Utility functions
│   ├── views/               # View components
│   ├── App.vue              # Root component
│   └── main.ts              # Application entry point
├── .env                      # Environment variables (create from .env.example)
├── .env.example              # Environment variables template
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite configuration
└── themeConfig.ts            # Theme settings
```

## Technology Stack

### Core Framework
- **[Vue 3](https://vuejs.org/)** - Progressive JavaScript framework
- **[Vite](https://vitejs.dev/)** - Next-generation frontend tooling
- **[TypeScript](https://www.typescriptlang.org/)** - Typed superset of JavaScript

### UI & Styling
- **[Vuetify 3](https://vuetifyjs.com/)** - Material Design component framework
- **[SASS/SCSS](https://sass-lang.com/)** - CSS preprocessor
- **[Iconify](https://iconify.design/)** - Universal icon framework

### Backend & Database
- **[Supabase](https://supabase.com/)** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication
  - Real-time subscriptions
  - Storage
  - Edge Functions

### State Management & Routing
- **[Pinia](https://pinia.vuejs.org/)** - Vue Store
- **[Vue Router](https://router.vuejs.org/)** - Official router for Vue.js
- **[unplugin-vue-router](https://github.com/posva/unplugin-vue-router)** - File-based routing

### Authorization
- **[CASL](https://casl.js.org/)** - Isomorphic authorization library

### Internationalization
- **[Vue I18n](https://vue-i18n.intlify.dev/)** - Internationalization plugin

### Code Quality
- **[ESLint](https://eslint.org/)** - Code linting
- **[Prettier](https://prettier.io/)** (optional) - Code formatting

### Deployment
- **[Cloudflare Pages](https://pages.cloudflare.com/)** - Edge hosting

## Database Schema

The application uses 13 main tables:

| Table | Purpose |
|-------|---------|
| `profile` | User profiles and preferences |
| `community` | Community/condominium information |
| `property` | Property/unit details |
| `role` | User roles (Super Admin, Admin, Guard, Resident, etc.) |
| `profile_role` | User-role assignments |
| `community_manager` | Manager-community assignments |
| `property_owner` | Owner-property assignments |
| `visitor_records_uid` | Visitor access records with QR codes |
| `visitor_record_logs` | Entry/exit logs |
| `automation_devices` | IoT devices for access control |
| `notifications` | System notifications |
| `notification_users` | User notification settings |
| `translations` | Multi-language text |

For detailed schema documentation, see [Supabase Schema](./docs/SUPABASE_SCHEMA.md).

## Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm dev:host         # Start with network access

# Building
pnpm build            # Build for production
pnpm preview          # Preview production build locally

# Code Quality
pnpm typecheck        # Run TypeScript type checking
pnpm lint             # Run ESLint (if configured)

# Dependencies
pnpm install          # Install dependencies
pnpm update           # Update dependencies
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

Mobile browsers are also supported for responsive layouts.

## License

This project is private and proprietary.

## Author

**Luis De Leon**

---

## Complete Documentation Index

All project documentation is available in the [`/docs`](./docs/) directory:

### Getting Started Guides

- **[Setup Guide](./docs/SETUP_GUIDE.md)** - Complete setup instructions for new developers
- **[Getting Started](./docs/GETTING_STARTED.md)** - Development environment setup and workflow
- **[Authentication](./docs/AUTHENTICATION.md)** - User management, auth configuration, and demo accounts

### Database & Backend

- **[Supabase Schema](./docs/SUPABASE_SCHEMA.md)** - Complete database schema documentation
- **[Supabase Usage](./docs/SUPABASE_USAGE.md)** - Code examples and usage patterns

### Security & Access Control

- **[RBAC Guide](./docs/RBAC_GUIDE.md)** - Comprehensive role-based access control implementation guide
  - Role hierarchy and permissions
  - Database schema enhancements
  - Implementation phases and migration
  - Code examples and best practices

### Deployment

- **[Cloudflare Setup](./docs/CLOUDFLARE_SETUP.md)** - Production deployment guide for Cloudflare Pages

---

## Need Help?

- 📚 Check the [Setup Guide](./docs/SETUP_GUIDE.md) for detailed instructions
- 🐛 Check the browser console and server logs for errors
- 🔍 Review [Supabase documentation](https://supabase.com/docs)
- 💬 Contact the development team for support

---

**Made with ❤️ using Vue 3 + Vuetify + Supabase**
