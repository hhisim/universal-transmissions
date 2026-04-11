import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// UT has its own /login page. This route redirects to it.
export default function MemberLoginPage() {
  redirect('/login')
}
