/**
 * Maps Supabase error messages to translation keys
 * This function takes an error message and returns the appropriate translation key
 */
export function getErrorMessageTranslationKey(errorMessage: string | undefined | null): string {
  if (!errorMessage) {
    return 'Invalid email or password'
  }

  const message = errorMessage.toLowerCase().trim()

  // Map common Supabase error messages to translation keys
  // Supabase returns "Invalid login credentials" for wrong email/password
  if (message.includes('invalid login credentials') || 
      message.includes('invalid credentials') ||
      message === 'invalid login credentials') {
    return 'Invalid login credentials'
  }

  if (message.includes('invalid email') || message.includes('email address')) {
    if (message.includes('required')) {
      return 'Email address is required'
    }
    return 'Invalid email address'
  }

  if (message.includes('invalid password') || message.includes('password')) {
    if (message.includes('required')) {
      return 'Password is required'
    }
    if (message.includes('short') || message.includes('length')) {
      return 'Password is too short'
    }
    return 'Invalid password'
  }

  if (message.includes('user not found') || message.includes('no user found')) {
    return 'User not found'
  }

  if (message.includes('email not confirmed') || message.includes('email_not_confirmed')) {
    return 'Email not confirmed'
  }

  if (message.includes('disabled') || message.includes('account disabled')) {
    return 'Your account has been disabled. Please contact support.'
  }

  if (message.includes('failed to create') && message.includes('profile')) {
    return 'Failed to create user profile'
  }

  if (message.includes('failed to fetch') && message.includes('profile')) {
    return 'Failed to fetch user profile'
  }

  if (message.includes('profile not found')) {
    return 'User profile not found'
  }

  if (message.includes('login failed') || message.includes('authentication failed')) {
    return 'Login failed'
  }

  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Email rate limit exceeded'
  }

  if (message.includes('already registered') || message.includes('user already exists')) {
    return 'User already registered'
  }

  if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
    return 'Network error'
  }

  // Default fallback
  return 'Invalid email or password'
}

