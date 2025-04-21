import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthUser } from '@/hooks/useAuthUser';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const AdminRoute: React.FC = () => {
  const { user, loading: authLoading } = useAuthUser();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null: henüz kontrol edilmedi
  const [profileLoading, setProfileLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
          setIsAdmin(false);
          setProfileLoading(false);
          return;
      }
      
      setProfileLoading(true);
      try {
          // Kullanıcının profilini çek ve rolünü kontrol et
          const { data: profile, error } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', user.id)
              .single(); // Tek bir profil bekliyoruz
          
          if (error && error.code !== 'PGRST116') { // PGRST116: Satır bulunamadı hatası
              console.error("Profil çekilirken hata:", error);
              setIsAdmin(false); 
          } else if (profile?.role === 'admin') {
              setIsAdmin(true);
          } else {
              setIsAdmin(false);
          }
      } catch (err) {
          console.error("Rol kontrolü sırasında genel hata:", err);
          setIsAdmin(false);
      } finally {
          setProfileLoading(false);
      }
    };

    if (!authLoading) { // Auth yüklemesi bittikten sonra rolü kontrol et
        checkAdminRole();
    }

  }, [user, authLoading]);

  const loading = authLoading || profileLoading;

  if (loading) {
    return <div>Yetki kontrol ediliyor...</div>; 
  }

  if (!user) {
    // Giriş yapmamışsa login'e yönlendir
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isAdmin === false) { // isAdmin null değilse ve false ise
    // Giriş yapmış ama admin değilse, ana menüye veya yetkisiz sayfasına yönlendir
    console.warn("Admin yetkisi olmayan kullanıcı /admin yoluna erişmeye çalıştı.");
    return <Navigate to="/menu" replace />; // veya /unauthorized
  }

  // Kullanıcı giriş yapmış ve admin ise, admin sayfasını (Outlet) göster.
  return <Outlet />;
};

export default AdminRoute; 