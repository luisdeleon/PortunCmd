<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <div class="h-100 d-flex align-center justify-md-space-between justify-center">
    <!-- 👉 Footer: left content -->
    <span class="d-flex align-center text-medium-emphasis">
      &copy;
      {{ new Date().getFullYear() }}
      {{ t('Made With') }}
      <VIcon
        icon="tabler-heart-filled"
        color="error"
        size="1.25rem"
        class="mx-1"
      />
      By <a
        href="https://pixinvent.com"
        target="_blank"
        rel="noopener noreferrer"
        class="text-primary ms-1"
      >Pixinvent</a>
    </span>
    <!-- 👉 Footer: right content -->
    <span class="d-md-flex gap-x-4 text-primary d-none">
      <a
        href="https://themeforest.net/licenses/standard"
        target="noopener noreferrer"
      >{{ t('License') }}</a>
      <a
        href="https://1.envato.market/pixinvent_portfolio"
        target="noopener noreferrer"
      >{{ t('More Themes') }}</a>
      <a
        href="https://github.com/luisdeleon/PortunCmd"
        target="noopener noreferrer"
      >{{ t('Documentation') }}</a>
      <a
        href="https://pixinvent.ticksy.com/"
        target="noopener noreferrer"
      >{{ t('Support') }}</a>
    </span>
  </div>
</template>
