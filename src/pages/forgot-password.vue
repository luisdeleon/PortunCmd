<script setup lang="ts">
import { VForm } from 'vuetify/components/VForm'
import { useGenerateImageVariant } from '@core/composable/useGenerateImageVariant'
import { VNodeRenderer } from '@layouts/components/VNodeRenderer'
import { themeConfig } from '@themeConfig'
import { useAuth } from '@/composables/useAuth'

import forgotPasswordImage from '@images/pages/img-forgot-w.png'
import authV2MaskDark from '@images/pages/misc-mask-dark.png'
import authV2MaskLight from '@images/pages/misc-mask-light.png'
import NavBarI18n from '@core/components/I18n.vue'

const { t } = useI18n({ useScope: 'global' })

const email = ref('')
const refVForm = ref<VForm>()
const isLoading = ref(false)
const isSuccess = ref(false)
const errorMessage = ref<string | undefined>(undefined)

const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark)

const { resetPassword } = useAuth()

definePage({
  meta: {
    layout: 'blank',
    unauthenticatedOnly: true,
  },
})

const onSubmit = async () => {
  const { valid } = await refVForm.value?.validate() ?? { valid: false }
  
  if (!valid)
    return

  isLoading.value = true
  errorMessage.value = undefined
  isSuccess.value = false

  try {
    await resetPassword(email.value)
    isSuccess.value = true
  }
  catch (err: any) {
    errorMessage.value = err?.message || t('Failed to send reset email. Please try again.')
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="auth-header d-flex align-center justify-space-between">
    <RouterLink to="/">
      <div class="auth-logo d-flex align-center gap-x-3">
        <VNodeRenderer :nodes="themeConfig.app.logo" />
        <h1 class="auth-title">
          {{ themeConfig.app.title }}
        </h1>
      </div>
    </RouterLink>
    
    <!-- Language Dropdown -->
    <div
      v-if="themeConfig.app.i18n.enable && themeConfig.app.i18n.langConfig?.length"
      class="auth-language-switcher"
    >
      <NavBarI18n
        :languages="themeConfig.app.i18n.langConfig"
        location="bottom end"
      />
    </div>
  </div>

  <VRow
    class="auth-wrapper bg-surface"
    no-gutters
  >
    <VCol
      md="8"
      class="d-none d-md-flex"
    >
      <div class="position-relative bg-background w-100 me-0">
        <div
          class="d-flex align-center justify-center w-100 h-100"
          style="padding-inline: 150px;"
        >
          <VImg
            max-width="468"
            :src="forgotPasswordImage"
            class="auth-illustration mt-16 mb-2"
          />
        </div>

        <img
          class="auth-footer-mask"
          :src="authThemeMask"
          alt="auth-footer-mask"
          height="280"
          width="100"
        >
      </div>
    </VCol>

    <VCol
      cols="12"
      md="4"
      class="d-flex align-center justify-center"
    >
      <VCard
        flat
        :max-width="500"
        class="mt-12 mt-sm-0 pa-4"
      >
        <VCardText>
          <h4 class="text-h4 mb-1">
            {{ t('Forgot Password?') }} 🔒
          </h4>
          <p class="mb-0">
            {{ t('Enter your email and we\'ll send you instructions to reset your password') }}
          </p>
        </VCardText>

        <VCardText>
          <VAlert
            v-if="isSuccess"
            color="success"
            variant="tonal"
            class="mb-4"
          >
            <p class="text-sm mb-0">
              {{ t('Password reset email sent! Please check your inbox and follow the instructions to reset your password.') }}
            </p>
          </VAlert>

          <VAlert
            v-if="errorMessage"
            color="error"
            variant="tonal"
            class="mb-4"
          >
            <p class="text-sm mb-0">
              {{ errorMessage }}
            </p>
          </VAlert>

          <VForm
            v-if="!isSuccess"
            ref="refVForm"
            @submit.prevent="onSubmit"
          >
            <VRow>
              <!-- email -->
              <VCol cols="12">
                <AppTextField
                  v-model="email"
                  autofocus
                  :label="t('Email')"
                  type="email"
                  placeholder="johndoe@email.com"
                  :rules="[requiredValidator, emailValidator]"
                />
              </VCol>

              <!-- Reset link -->
              <VCol cols="12">
                <VBtn
                  block
                  type="submit"
                  :loading="isLoading"
                >
                  {{ t('Send Reset Link') }}
                </VBtn>
              </VCol>

              <!-- back to login -->
              <VCol cols="12">
                <RouterLink
                  class="d-flex align-center justify-center"
                  :to="{ name: 'login' }"
                >
                  <VIcon
                    icon="tabler-chevron-left"
                    size="20"
                    class="me-1 flip-in-rtl"
                  />
                  <span>{{ t('Back to login') }}</span>
                </RouterLink>
              </VCol>
            </VRow>
          </VForm>

          <VRow v-else>
            <VCol cols="12">
              <RouterLink
                class="d-flex align-center justify-center"
                :to="{ name: 'login' }"
              >
                <VIcon
                  icon="tabler-chevron-left"
                  size="20"
                  class="me-1 flip-in-rtl"
                />
                <span>{{ t('Back to login') }}</span>
              </RouterLink>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth.scss";
</style>
