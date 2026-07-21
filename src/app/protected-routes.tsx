import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../shared/hooks/useAuth';
import { LoadingState } from '../shared/components/LoadingState';
import type { Role } from '../shared/types/models';

export function ProtectedRoute({ roles }: { roles: Role[] }) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <LoadingState text="Validando acceso seguro..." />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.status === 'suspended' || profile.status === 'inactive') {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(profile.role)) {
    return (
      <Navigate
        to={profile.role === 'admin' ? '/admin/dashboard' : '/cliente/dashboard'}
        replace
      />
    );
  }

  return <Outlet />;
}