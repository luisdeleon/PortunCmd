<script setup lang="ts">
import type { I18nLanguage } from '@layouts/types'
import { cookieRef } from '@layouts/stores/config'

interface Props {
  languages: I18nLanguage[]
  location?: any
}

const props = withDefaults(defineProps<Props>(), {
  location: 'bottom end',
})

const { locale } = useI18n({ useScope: 'global' })
const storedLang = cookieRef<string | null>('language', null)

// Function to change language and save to cookie
const changeLanguage = (lang: string) => {
  locale.value = lang
  storedLang.value = lang
}
</script>

<template>
  <IconBtn>
    <VIcon icon="tabler-language" />

    <!-- Menu -->
    <VMenu
      activator="parent"
      :location="props.location"
      offset="12px"
      width="175"
    >
      <!-- List -->
      <VList
        :selected="[locale]"
        color="primary"
      >
        <!-- List item -->
        <VListItem
          v-for="lang in props.languages"
          :key="lang.i18nLang"
          :value="lang.i18nLang"
          @click="changeLanguage(lang.i18nLang)"
        >
          <!-- Language label -->
          <VListItemTitle>
            {{ lang.label }}
          </VListItemTitle>
        </VListItem>
      </VList>
    </VMenu>
  </IconBtn>
</template>
