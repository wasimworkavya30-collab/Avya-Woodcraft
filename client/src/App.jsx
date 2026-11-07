import { useEffect } from 'react';
import { useRouter } from './router.jsx';
import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import DeviceSetup from './pages/DeviceSetup.jsx';
import EmployeeApp from './pages/employee/EmployeeApp.jsx';
import AdminApp from './pages/admin/AdminApp.jsx';

export default function App() {
  const { path, navigate } = useRouter();
  const { user } = useAuth();
  const home = user ? (user.role === 'admin' ? '/admin' : '/employee') : '/login';

  useEffect(() => {
    const wrongArea = user && !path.startsWith(`/${user.role}`) && path !== '/device';
    const needsLogin = !user && path !== '/login' && path !== '/device';
    if (wrongArea || needsLogin || path === '/') navigate(home, { replace: true });
  }, [path, user, home, navigate]);

  if (path === '/device') return <DeviceSetup />;
  if (!user) return <Login />;
  if (user.role === 'admin' && path.startsWith('/admin')) return <AdminApp />;
  if (user.role === 'employee' && path.startsWith('/employee')) return <EmployeeApp />;
  return null;
}
