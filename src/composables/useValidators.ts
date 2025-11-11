import { isEmpty, isEmptyArray, isNullOrUndefined } from '@core/utils/helpers'

/**
 * Composable that returns translated validators
 * These validators use the current i18n locale for error messages
 */
export const useValidators = () => {
  const { t } = useI18n({ useScope: 'global' })

  // 👉 Required Validator
  const requiredValidator = (value: unknown) => {
    if (isNullOrUndefined(value) || isEmptyArray(value) || value === false)
      return t('This field is required')

    return !!String(value).trim().length || t('This field is required')
  }

  // 👉 Email Validator
  const emailValidator = (value: unknown) => {
    if (isEmpty(value))
      return true

    const re = /^(?:[^<>()[\]\\.,;:\s@"]+(?:\.[^<>()[\]\\.,;:\s@"]+)*|".+")@(?:\[\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\]|(?:[a-z\-\d]+\.)+[a-z]{2,})$/i

    if (Array.isArray(value))
      return value.every(val => re.test(String(val))) || t('The Email field must be a valid email')

    return re.test(String(value)) || t('The Email field must be a valid email')
  }

  // 👉 Password Validator
  const passwordValidator = (password: string) => {
    const regExp = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%&*()]).{8,}/

    const validPassword = regExp.test(password)

    return validPassword || t('Field must contain at least one uppercase, lowercase, special character and digit with min 8 chars')
  }

  // 👉 Confirm Password Validator
  const confirmedValidator = (value: string, target: string) =>
    value === target || t('The Confirm Password field confirmation does not match')

  return {
    requiredValidator,
    emailValidator,
    passwordValidator,
    confirmedValidator,
  }
}

