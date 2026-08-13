import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { PageLoader } from './ui/Spinner';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader message="authenticating" />;

  if (!user) return <Navigate to="/login" replace />;

  return children || <Outlet />;
}
