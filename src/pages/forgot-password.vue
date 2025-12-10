<script setup lang="ts">
import { VForm } from 'vuetify/components/VForm'
import { useGenerateImageVariant } from '@core/composable/useGenerateImageVariant'
import { VNodeRenderer } from '@layouts/components/VNodeRenderer'
import { themeConfig } from '@themeConfig'
import { useAuth } from '@/composables/useAuth'
import { getErrorMessageTranslationKey } from '@/utils/errorTranslations'
import { useValidators } from '@/composables/useValidators'
import { useTurnstile } from '@/composables/useTurnstile'

import forgotPasswordImage from '@images/pages/img-forgot-w.png'
import authV2MaskDark from '@images/pages/misc-mask-dark.png'
import authV2MaskLight from '@images/pages/misc-mask-light.png'
import NavBarI18n from '@core/components/I18n.vue'

const { t, locale } = useI18n({ useScope: 'global' })

// Create validation rules as computed that depend on locale
// This ensures validators are recreated when locale changes, forcing Vue to re-validate
// Note: We need to explicitly use the validators from useValidators to avoid
// conflicts with auto-imported validators from @core/utils/validators
const emailRules = computed(() => {
  // Read locale.value to make this computed reactive to locale changes
  const currentLocale = locale.value
  // Create new validator functions that use the current locale
  const validators = useValidators()
  // Return new array reference so Vue detects the change
  return [
    (value: unknown) => validators.requiredValidator(value),
    (value: unknown) => validators.emailValidator(value),
  ]
})

// Watch for locale changes and trigger form re-validation to update error messages
watch(locale, () => {
  // When locale changes, the computed rules will update automatically
  // But we need to re-validate the form to show the new translated messages
  if (refVForm.value) {
    // Clear any existing error message
    errorMessage.value = undefined
    // Wait for rules to update, then re-validate to show new translated messages
    nextTick(() => {
      refVForm.value?.resetValidation()
      // Re-validate if there's a value in the email field to show errors in new language
      if (email.value) {
        setTimeout(() => {
          refVForm.value?.validate()
        }, 50)
      }
    })
  }
})

const email = ref('')
const refVForm = ref<VForm>()
const isLoading = ref(false)
const isSuccess = ref(false)
const errorMessage = ref<string | undefined>(undefined)

const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark)

const { resetPassword } = useAuth()

// Turnstile CAPTCHA
const {
  token: turnstileToken,
  isVerified: isTurnstileVerified,
  render: renderTurnstile,
  reset: resetTurnstile,
  validate: validateTurnstile,
} = useTurnstile()

// Render Turnstile widget on mount
onMounted(() => {
  nextTick(() => {
    renderTurnstile('#turnstile-forgot-password', {
      theme: 'auto',
      size: 'flexible',
      action: 'forgot-password',
    })
  })
})

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

  // Validate Turnstile token first
  if (!turnstileToken.value) {
    errorMessage.value = t('Please complete the security verification')
    return
  }

  isLoading.value = true
  errorMessage.value = undefined
  isSuccess.value = false

  try {
    // Validate Turnstile token server-side
    const turnstileResult = await validateTurnstile()
    if (!turnstileResult.success) {
      console.error('Turnstile validation failed:', turnstileResult['error-codes'])
      errorMessage.value = t('Security verification failed. Please try again.')
      resetTurnstile()
      isLoading.value = false
      return
    }

    await resetPassword(email.value)
    isSuccess.value = true
  }
  catch (err: any) {
    // Translate error message
    const errorKey = getErrorMessageTranslationKey(err?.message)
    errorMessage.value = t(errorKey)
    // Reset Turnstile on error
    resetTurnstile()
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
              {{ t('Please check your inbox for a reset link and click it to update your password. Don\'t forget to check your spam or junk folder as well.') }}
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
                  :key="`email-${locale}`"
                  v-model="email"
                  autofocus
                  :label="t('Email')"
                  type="email"
                  placeholder="johndoe@email.com"
                  :rules="emailRules"
                />
              </VCol>

              <!-- Cloudflare Turnstile CAPTCHA -->
              <VCol cols="12">
                <div
                  id="turnstile-forgot-password"
                  class="d-flex justify-center mb-2"
                />
              </VCol>

              <!-- Reset link -->
              <VCol cols="12">
                <VBtn
                  block
                  type="submit"
                  :loading="isLoading"
                  :disabled="!isTurnstileVerified"
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
