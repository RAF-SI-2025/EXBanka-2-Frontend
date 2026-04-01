import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getHomeForRole } from '@/router/helpers'

/**
 * Dozvoljava pristup portalu hartija klijentima, zaposlenima i adminima.
 */
export default function HartijePortalRoute() {
  const user = useAuthStore((s) => s.user)
  if (!user) return null
  if (user.userType !== 'CLIENT' && user.userType !== 'EMPLOYEE' && user.userType !== 'ADMIN') {
    return <Navigate to={getHomeForRole(user.userType)} replace />
  }
  return <Outlet />
}
