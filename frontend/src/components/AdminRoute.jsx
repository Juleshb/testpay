import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { PageLoader } from './ui/Spinner';

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader message="authenticating" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;

  return children;
}
