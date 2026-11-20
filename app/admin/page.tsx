import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AdminDashboard } from '@/components/admin/dashboard'
import { getAdminSession } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Staff dashboard | Town of Chilhowie',
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  return <AdminDashboard staffName={session.name}/>
}
