<script setup lang="ts">
import { VForm } from 'vuetify/components/VForm'
import { useGenerateImageVariant } from '@core/composable/useGenerateImageVariant'
import loginImage from '@images/pages/img-login-m.png'
import authV2MaskDark from '@images/pages/misc-mask-dark.png'
import authV2MaskLight from '@images/pages/misc-mask-light.png'
import chromeLogo from '@images/logos/chrome.png'
import firefoxLogo from '@images/logos/firefox.png'
import safariLogo from '@images/logos/safari.png'
import { VNodeRenderer } from '@layouts/components/VNodeRenderer'
import { themeConfig } from '@themeConfig'
import { useAuth } from '@/composables/useAuth'
import NavBarI18n from '@core/components/I18n.vue'
import { cookieRef } from '@layouts/stores/config'
import { COOKIE_MAX_AGE_1_YEAR } from '@/utils/constants'
import { getErrorMessageTranslationKey } from '@/utils/errorTranslations'
import { useValidators } from '@/composables/useValidators'

const authThemeMask = useGenerateImageVariant(authV2MaskLight, authV2MaskDark)

definePage({
  meta: {
    layout: 'blank',
    unauthenticatedOnly: true,
  },
})

// Language auto-detection and translations
const { locale, t } = useI18n({ useScope: 'global' })
const storedLang = cookieRef<string | null>('language', null)

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

const passwordRules = computed(() => {
  // Read locale.value to make this computed reactive to locale changes
  const currentLocale = locale.value
  // Create new validator functions that use the current locale
  const validators = useValidators()
  // Return new array reference so Vue detects the change
  return [
    (value: unknown) => validators.requiredValidator(value),
  ]
})

// Auto-detect browser language - run immediately (not in onMounted to avoid flicker)
if (typeof window !== 'undefined') {
  // Only auto-detect if no language is stored in cookie
  if (!storedLang.value) {
    const browserLang = navigator.language || (navigator as any).userLanguage
    const langCode = browserLang.split('-')[0].toLowerCase()
    
    // Check if browser language is supported (en, es, pt)
    const supportedLangs = ['en', 'es', 'pt']
    if (supportedLangs.includes(langCode)) {
      locale.value = langCode
      storedLang.value = langCode
    }
  } else {
    // Use stored language
    locale.value = storedLang.value
  }
}

const isPasswordVisible = ref(false)
const refVForm = ref<VForm>()

const route = useRoute()
const router = useRouter()

const ability = useAbility()
const { login: authLogin } = useAuth()

const errors = ref<Record<string, string | undefined>>({
  email: undefined,
  password: undefined,
})

const credentials = ref({
  email: '',
  password: '',
})

const rememberMe = ref(false)
const isLoading = ref(false)

// Watch for locale changes and trigger form re-validation to update error messages
watch(locale, () => {
  // When locale changes, the computed rules will update automatically
  // But we need to re-validate the form to show the new translated messages
  if (refVForm.value) {
    // Clear any existing validation errors
    errors.value = {
      email: undefined,
      password: undefined,
    }
    // Wait for rules to update, then re-validate to show new translated messages
    nextTick(() => {
      refVForm.value?.resetValidation()
      // Re-validate if there are values in the fields to show errors in new language
      if (credentials.value.email || credentials.value.password) {
        setTimeout(() => {
          refVForm.value?.validate()
        }, 50)
      }
    })
  }
})

const login = async () => {
  // Clear previous errors
  errors.value = {
    email: undefined,
    password: undefined,
  }

  isLoading.value = true

  try {
    const res = await authLogin(credentials.value.email, credentials.value.password)

    // Only proceed with redirect if login was successful
    if (!res || !res.accessToken || !res.userData || !res.userAbilityRules) {
      throw new Error('Invalid login response')
    }

    const { accessToken, userData, userAbilityRules } = res

    console.log('Login successful:', { userData, role: userData.role })

    // Set cookie expiration based on rememberMe
    // Note: Cookies are set without namespace for auth tokens
    const maxAge = rememberMe.value
      ? COOKIE_MAX_AGE_1_YEAR // 1 year if remember me is checked
      : 60 * 60 * 24 * 30 // 30 days if not checked

    // Set cookies with appropriate expiration
    // Create cookies with custom maxAge options
    const cookieOptions = { maxAge, path: '/' }
    
    const userAbilityRulesCookie = useCookie('userAbilityRules', cookieOptions)
    userAbilityRulesCookie.value = userAbilityRules
    ability.update(userAbilityRules)

    const userDataCookie = useCookie('userData', cookieOptions)
    userDataCookie.value = userData
    
    const accessTokenCookie = useCookie('accessToken', cookieOptions)
    accessTokenCookie.value = accessToken

    console.log('Cookies set:', {
      hasUserData: !!userDataCookie.value,
      hasAccessToken: !!accessTokenCookie.value,
      hasAbilityRules: !!userAbilityRulesCookie.value
    })

    // Determine redirect target
    const redirectQuery = route.query.to
    const redirectTo = typeof redirectQuery === 'string' && redirectQuery.length
      ? redirectQuery
      : Array.isArray(redirectQuery) && redirectQuery.length
        ? redirectQuery[0]
        : '/dashboard'

    console.log('Login successful, redirecting to:', redirectTo)

    // Ensure navigation completes before finishing login flow
    await router.replace(redirectTo)
  }
  catch (err: any) {
    // Stay on login page and show error
    console.error('Login error:', err)
    
    // Handle Supabase auth errors and translate them
    const errorKey = getErrorMessageTranslationKey(err?.message)
    const translatedMessage = t(errorKey)
    
    // Show error on email field (as it's the most prominent)
    // This will be displayed in red by Vuetify
    errors.value.email = translatedMessage
    
    // Don't redirect - stay on login page
    return
  }
  finally {
    isLoading.value = false
  }
}

const onSubmit = () => {
  refVForm.value?.validate()
    .then(({ valid: isValid }) => {
      if (isValid)
        login()
    })
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
    no-gutters
    class="auth-wrapper bg-surface"
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
            :src="loginImage"
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
      class="auth-card-v2 d-flex align-center justify-center"
    >
      <VCard
        flat
        :max-width="500"
        class="mt-12 mt-sm-0 pa-4"
      >
        <VCardText>
          <h4 class="text-h4 mb-1">
            {{ t('Welcome to') }} <span class="text-capitalize"> {{ themeConfig.app.title }} </span>! 👋🏻
          </h4>
          <p class="mb-0">
            {{ t('Please sign-in to your account and start the adventure') }}
          </p>
        </VCardText>
        <VCardText>
          <VForm
            ref="refVForm"
            @submit.prevent="onSubmit"
          >
            <VRow>
              <!-- email -->
              <VCol cols="12">
                <AppTextField
                  :key="`email-${locale}`"
                  v-model="credentials.email"
                  :label="t('Email')"
                  placeholder="johndoe@email.com"
                  type="email"
                  autofocus
                  :rules="emailRules"
                  :error-messages="errors.email"
                />
              </VCol>

              <!-- password -->
              <VCol cols="12">
                <AppTextField
                  :key="`password-${locale}`"
                  v-model="credentials.password"
                  :label="t('Password')"
                  placeholder="············"
                  :rules="passwordRules"
                  :type="isPasswordVisible ? 'text' : 'password'"
                  autocomplete="password"
                  :error-messages="errors.password"
                  :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
                  @click:append-inner="isPasswordVisible = !isPasswordVisible"
                />

                <div class="d-flex align-center flex-wrap justify-space-between my-6">
                  <VCheckbox
                    v-model="rememberMe"
                    :label="t('Remember me')"
                  />
                  <RouterLink
                    class="text-primary ms-2 mb-1"
                    :to="{ name: 'forgot-password' }"
                  >
                    {{ t('Forgot Password?') }}
                  </RouterLink>
                </div>

                <VBtn
                  block
                  type="submit"
                  :loading="isLoading"
                >
                  {{ t('Login') }}
                </VBtn>
              </VCol>
              <VCol
                cols="12"
                class="d-flex align-center"
              >
                <VDivider />
                <span class="mx-4 text-sm">{{ t('browsers') }}</span>
                <VDivider />
              </VCol>

              <!-- browser recommendations -->
              <VCol
                cols="12"
                class="text-center"
              >
                <div class="d-flex justify-center flex-wrap gap-3">
                  <a
                    href="https://www.google.com/chrome/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-decoration-none"
                  >
                    <VAvatar
                      size="32"
                      class="cursor-pointer browser-logo"
                    >
                      <VImg
                        :src="chromeLogo"
                        alt="Chrome"
                      />
                    </VAvatar>
                  </a>
                  <a
                    href="https://www.mozilla.org/firefox/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-decoration-none"
                  >
                    <VAvatar
                      size="32"
                      class="cursor-pointer browser-logo"
                    >
                      <VImg
                        :src="firefoxLogo"
                        alt="Firefox"
                      />
                    </VAvatar>
                  </a>
                  <a
                    href="https://www.apple.com/safari/"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-decoration-none"
                  >
                    <VAvatar
                      size="32"
                      class="cursor-pointer browser-logo"
                    >
                      <VImg
                        :src="safariLogo"
                        alt="Safari"
                      />
                    </VAvatar>
                  </a>
                </div>
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth";
</style>
