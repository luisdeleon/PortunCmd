<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
</script>

<template>
  <div class="h-100 d-flex align-center justify-space-between">
    <!-- 👉 Footer: left content - copyright -->
    <span class="text-medium-emphasis">
      {{ t('footer.copyright', { year: new Date().getFullYear() }) }}
    </span>

    <!-- 👉 Footer: right content - links -->
    <span class="d-flex gap-x-4 text-medium-emphasis">
      <a
        href="https://webzy.io/terms-and-conditions"
        target="_blank"
        rel="noopener noreferrer"
        class="text-medium-emphasis"
      >{{ t('footer.termsAndConditions') }}</a>
      <a
        href="https://webzy.io/terms-of-service"
        target="_blank"
        rel="noopener noreferrer"
        class="text-medium-emphasis"
      >{{ t('footer.termsOfService') }}</a>
      <a
        href="https://webzy.io/privacy-policy"
        target="_blank"
        rel="noopener noreferrer"
        class="text-medium-emphasis"
      >{{ t('footer.privacyPolicy') }}</a>
      <a
        href="https://webzy.io/cookie-policy"
        target="_blank"
        rel="noopener noreferrer"
        class="text-medium-emphasis"
      >{{ t('footer.cookiePolicy') }}</a>
    </span>
  </div>
</template>
