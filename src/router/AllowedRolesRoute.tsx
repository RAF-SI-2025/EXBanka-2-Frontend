import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { C4UserRole } from '@/types/celina4'
import { getHomeForRole } from './helpers'

interface AllowedRolesRouteProps {
  allowedRoles: C4UserRole[]
  children: React.ReactNode
}

function userHasRole(user: ReturnType<typeof useAuthStore.getState>['user'], role: C4UserRole, hasPermission: (p: string) => boolean): boolean {
  if (!user) return false
  switch (role) {
    case 'CLIENT':
      return user.userType === 'CLIENT'
    case 'SUPERVISOR':
      return (user.userType === 'EMPLOYEE' || user.userType === 'ADMIN') && hasPermission('SUPERVISOR')
    case 'AGENT':
      return user.userType === 'EMPLOYEE'
    default:
      return false
  }
}

export default function AllowedRolesRoute({ allowedRoles, children }: AllowedRolesRouteProps) {
  const { isAuthenticated, user, hasPermission } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const allowed = allowedRoles.some(role => userHasRole(user, role, hasPermission))

  if (!allowed) {
    return <Navigate to={getHomeForRole(user?.userType)} replace />
  }

  return <>{children}</>
}
