import type { Metadata } from 'next'
import { LoginForm } from '@/components/admin/login-form'

export const metadata: Metadata = {
  title: 'Staff sign-in | Town of Chilhowie',
  robots: { index: false, follow: false },
}

export default function AdminLoginPage() {
  return <LoginForm />
}
