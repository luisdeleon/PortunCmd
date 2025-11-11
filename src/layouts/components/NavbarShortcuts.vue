<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })

const shortcuts = computed(() => [
  {
    icon: 'tabler-calendar',
    title: t('Calendar'),
    subtitle: t('Appointments'),
    to: { name: 'apps-calendar' },
  },
  {
    icon: 'tabler-file-dollar',
    title: t('Invoice App'),
    subtitle: t('Manage Accounts'),
    to: { name: 'apps-invoice-list' },
  },
  {
    icon: 'tabler-user',
    title: t('Users'),
    subtitle: t('Manage Users'),
    to: { name: 'apps-user-list' },
  },
  {
    icon: 'tabler-users',
    title: t('Role Management'),
    subtitle: t('Permission'),
    to: { name: 'apps-roles' },
  },
  {
    icon: 'tabler-device-desktop-analytics',
    title: t('Dashboard'),
    subtitle: t('Dashboard Analytics'),
    to: { name: 'dashboards-analytics' },
  },
  {
    icon: 'tabler-settings',
    title: t('Settings'),
    subtitle: t('Account Settings'),
    to: { name: 'pages-account-settings-tab', params: { tab: 'account' } },
  },

])
</script>

<template>
  <Shortcuts :shortcuts="shortcuts" />
</template>
