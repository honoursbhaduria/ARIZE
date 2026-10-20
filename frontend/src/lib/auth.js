import { exchangeSupabaseSession, registerUser, supabaseRegister } from '../services/api'

// Creates the account in Supabase (when configured) and in the Django API.
// Throws with a user-facing message on failure.
export async function registerAccount({ username, email, password }) {
  const cleanUsername = username.trim()
  const cleanEmail = email.trim()
  if (!cleanUsername || !cleanEmail || !password) throw new Error('Please fill in all fields.')
  if (password.length < 8) throw new Error('Password must be at least 8 characters long.')

  let sbSession = null
  try {
    sbSession = await supabaseRegister({ email: cleanEmail, password, username: cleanUsername })
  } catch (sbErr) {
    if (/already registered|already in use/i.test(sbErr.message || '')) {
      throw new Error('A user with that email already exists. Please sign in instead.')
    }
    console.warn('Supabase signup notice:', sbErr.message)
  }

  try {
    await registerUser({ username: cleanUsername, email: cleanEmail, password })
  } catch (apiErr) {
    // Backend signup failed but Supabase gave us a session: exchange it instead.
    if (!sbSession) throw apiErr
    await exchangeSupabaseSession(sbSession)
  }
}
