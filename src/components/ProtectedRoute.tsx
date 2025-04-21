import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthUser } from '@/hooks/useAuthUser';

interface ProtectedRouteProps {
  // İleride role göre koruma eklemek istersek diye prop ekleyebiliriz
  // allowedRoles?: string[]; 
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = () => {
  const { user, loading } = useAuthUser();
  const location = useLocation();

  if (loading) {
    // Auth durumu yüklenirken boş veya bir yükleniyor göstergesi döndür
    // Bu, sayfanın kısa süreliğine görünüp sonra login'e atmasını engeller
    return <div>Oturum kontrol ediliyor...</div>; // Veya daha iyi bir loading spinner
  }

  if (!user) {
    // Kullanıcı giriş yapmamışsa, login sayfasına yönlendir.
    // Yönlendirme sonrası geri dönebilmek için mevcut konumu state olarak gönder.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Kullanıcı giriş yapmışsa, istenen sayfayı (Outlet) göster.
  return <Outlet />;
};

export default ProtectedRoute; 