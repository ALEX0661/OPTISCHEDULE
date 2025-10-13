import { ReactElement } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

function ProtectedRoute(): ReactElement {
  const token = localStorage.getItem('accessToken');
  return token ? <Outlet /> : <Navigate to="/" />;
}

export default ProtectedRoute;
