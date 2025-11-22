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
- 👥 [User Management](./docs/USER_MANAGEMENT.md) - User CRUD, bulk operations, and deletion workflows
- 🧭 [Navigation Menu Guide](./docs/NAVIGATION_MENU_GUIDE.md) - **NEW!** Complete navigation structure and implementation roadmap
- 🌐 [Cloudflare Setup](./docs/CLOUDFLARE_SETUP.md) - Production deployment guide

### Technical Reference

- 🗄️ [Supabase Schema](./docs/SUPABASE_SCHEMA.md) - Complete database schema
- 💻 [Supabase Usage](./docs/SUPABASE_USAGE.md) - Code examples and patterns
- 🔐 [RBAC Guide](./docs/RBAC_GUIDE.md) - Role-based access control implementation guide
- 🔒 **[Scope Visual Reference](./docs/SCOPE_VISUAL_REFERENCE.md)** - **ALL 4 scopes explained visually**
- 🔒 [Scope System Guide](./docs/SCOPE_SYSTEM_GUIDE.md) - Complete scope-based access control reference
- 🏢 [Community-User-Property Guide](./docs/COMMUNITY_USER_PROPERTY_GUIDE.md) - Understanding the database design
- 📊 [Data Model Workflows](./docs/DATA_MODEL_WORKFLOWS.md) - Visual workflows and practical examples
- 🎨 [Database Visual Reference](./docs/DATABASE_VISUAL_REFERENCE.md) - Quick visual reference with diagrams
- 📖 [Database Complete Guide](./docs/DATABASE_COMPLETE_GUIDE.md) - Executive summary tying everything together
- 🏷️ [Status System Design](./docs/STATUS_SYSTEM_DESIGN.md) - Status lifecycle management for Users, Communities, and Properties
- ⚙️ [Status System Implementation](./docs/STATUS_SYSTEM_IMPLEMENTATION.md) - Step-by-step implementation guide with SQL scripts
- 🌍 [Status System i18n Guide](./docs/STATUS_I18N_GUIDE.md) - Multilingual translations (EN/ES/PT)

### Development Tools

- 📊 [Statusline Setup](./docs/STATUSLINE_SETUP.md) - Claude CLI statusline configuration with usage tracking

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
- **[User Management](./docs/USER_MANAGEMENT.md)** - **NEW!** Comprehensive user management guide
  - User view page with statistics and icons
  - Single and bulk delete operations
  - Bulk import from CSV files
  - Enable/Disable user accounts
  - Complete database cleanup with `delete_user_completely()` function
  - Deletion across auth.users and all related tables
  - Code examples and best practices

### Database & Backend

- **[Supabase Schema](./docs/SUPABASE_SCHEMA.md)** - Complete database schema documentation
- **[Supabase Usage](./docs/SUPABASE_USAGE.md)** - Code examples and usage patterns
- **[Database Backup](./docs/DATABASE_BACKUP.md)** - Backup procedures, restoration guides, and migration safety
- **[Status System Design](./docs/STATUS_SYSTEM_DESIGN.md)** - **NEW!** Comprehensive status lifecycle management
  - 5 user statuses (Active, Pending, Suspended, Inactive, Archived)
  - 8 community statuses (Active, Under Construction, Pre-Launch, Full Capacity, etc.)
  - 9 property statuses (Active, Vacant, Access Restricted, Emergency Lockdown, etc.)
  - Status transition diagrams and business rules
  - Visitor access control by property status
  - Database schema additions and audit trail
  - Implementation phases and best practices
  - Color coding and UI component examples
- **[Status System Implementation Plan](./docs/STATUS_SYSTEM_IMPLEMENTATION.md)** - **NEW!** Step-by-step implementation guide
  - Complete SQL migration scripts for all tables
  - Database functions for status changes with validation
  - Audit trail implementation
  - Frontend composables and components (useStatus, StatusBadge, StatusChangeDialog)
  - UI integration examples for list pages and dashboard
  - Testing checklist and validation queries
  - Production deployment strategy with rollback plan
- **[Status System i18n Guide](./docs/STATUS_I18N_GUIDE.md)** - **NEW!** Multilingual status translations
  - Complete translations in English, Spanish, and Portuguese
  - Database best practices (store English only)
  - Frontend usage with vue-i18n
  - Component examples with i18n integration
  - Translation key reference and quick lookup table
- **[Community-User-Property Guide](./docs/COMMUNITY_USER_PROPERTY_GUIDE.md)** - **NEW!** Comprehensive guide to understanding the database design
  - Entity relationships and core concepts
  - Database schema diagrams with Mermaid visualizations
  - Step-by-step creation workflows for Communities → Users → Properties
  - Common scenarios and best practices
  - Complete walkthrough with examples
- **[Data Model Workflows](./docs/DATA_MODEL_WORKFLOWS.md)** - **NEW!** Visual workflows and practical implementation
  - Data flow architecture diagrams
  - Sequence diagrams for common operations
  - Bulk operations and query examples
  - Troubleshooting guide with solutions
  - Role-based access patterns
- **[Database Visual Reference](./docs/DATABASE_VISUAL_REFERENCE.md)** - **NEW!** Quick visual reference guide
  - Simple entity relationship diagrams
  - Visual glossary with icons and symbols
  - Quick start checklist
  - Decision trees and common patterns
  - ASCII art diagrams for quick understanding

### Security & Access Control

- **[RBAC Guide](./docs/RBAC_GUIDE.md)** - Comprehensive role-based access control system design
  - Role hierarchy and permissions
  - Database schema enhancements
  - Implementation phases and migration
  - Code examples and best practices
- **[Scope Visual Reference](./docs/SCOPE_VISUAL_REFERENCE.md)** - ⭐ **START HERE!** Visual guide to ALL 4 scopes
  - **1️⃣ Global Scope** - Super Admin (entire system)
  - **2️⃣ Dealer Scope** - Dealer (their communities)
  - **3️⃣ Community Scope** - Administrator/Guard (specific communities)
  - **4️⃣ Property Scope** - Resident (their properties)
  - Visual diagrams for each scope showing exactly what users can access
  - Database structure and SQL examples for every scope
  - Scope hierarchy and inheritance explained
  - Complete comparison table and troubleshooting guide
- **[Scope System Guide](./docs/SCOPE_SYSTEM_GUIDE.md)** - Complete technical scope reference
  - Detailed explanation of all 4 scope types
  - How scopes work and are enforced via RLS policies
  - Database structure for scope management
  - Complete SQL examples for each scope type
  - Multi-scope scenarios (users with multiple roles)
  - Scope resolution flow diagrams
  - Best practices and troubleshooting
  - Real-world scope assignment patterns
- **[RBAC Implementation](./docs/RBAC_IMPLEMENTATION.md)** - **NEW!** Phase-by-phase RBAC UI implementation
  - Phase 1: Role management foundation with real-time data
  - Phase 2: Advanced features (scope-based assignment, permission matrix)
  - Component structure and API integration
  - Complete changelog and troubleshooting guide

### Deployment

- **[Cloudflare Setup](./docs/CLOUDFLARE_SETUP.md)** - Production deployment guide for Cloudflare Pages

### UI & User Experience

- **[Navigation Menu Guide](./docs/NAVIGATION_MENU_GUIDE.md)** - **NEW!** Comprehensive navigation structure and implementation roadmap
  - Current navigation state and gaps analysis
  - Complete recommended navigation structure for all features
  - Role-based navigation menus (Super Admin, Dealer, Administrator, Resident, Guard, Client)
  - 10-phase implementation roadmap with detailed todos
  - Design principles and best practices
  - Technical implementation guide with code examples
  - Icon reference and route meta configuration

### Development & Tooling

- **[Statusline Setup](./docs/STATUSLINE_SETUP.md)** - Claude CLI statusline configuration guide
  - Custom statusline displaying model, directory, git branch
  - Session and week usage tracking
  - Quick update commands and automation
  - Troubleshooting and customization options

---

## Need Help?

- 📚 Check the [Setup Guide](./docs/SETUP_GUIDE.md) for detailed instructions
- 🐛 Check the browser console and server logs for errors
- 🔍 Review [Supabase documentation](https://supabase.com/docs)
- 💬 Contact the development team for support

---

**Made with ❤️ using Vue 3 + Vuetify + Supabase**
