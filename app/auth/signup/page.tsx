import { redirect } from 'next/navigation'

// Signup is now the same as login — magic link handles new and existing users
export default function SignupPage() {
  redirect('/auth/login')
}
