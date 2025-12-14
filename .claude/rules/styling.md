---
paths: src/assets/styles/**, themeConfig.ts, src/@layouts/**
---

# Styling & Design Guidelines

## Design System

**CRITICAL: Do not deviate from the established template design and theme colors.**

- **Preserve existing design system** - Use the Vuetify template patterns
- **Maintain theme colors** - Defined in `themeConfig.ts` and `src/assets/styles/variables/_vuetify.scss`
- **Use existing components** - Leverage `src/@core/components/` and Vuetify
- **Respect bordered skin** - App uses `Skins.Bordered` as default
- **Follow layout patterns** - Use `src/@layouts/` and `src/layouts/`

## Technology Stack

- Vuetify for component library (Material Design)
- SCSS with Vuetify variables
- Theme config in `themeConfig.ts`
- Light/dark mode with system preference detection

## Key Files

- Theme config: `themeConfig.ts`
- Vuetify variables: `src/assets/styles/variables/_vuetify.scss`
- Layouts: `src/layouts/` and `src/@layouts/`

## Icon System

Uses Iconify with Tabler icons:
```vue
<VIcon icon="tabler-icon-name" />
```

## Internationalization

- Languages: English (en), Spanish (es), Portuguese (pt)
- Enabled by default
- Translation files: `src/plugins/i18n/locales/`

## Best Practices

- Study existing pages before creating new ones
- Match visual and interaction patterns
- Don't introduce conflicting UI paradigms
- Don't modify the color scheme
