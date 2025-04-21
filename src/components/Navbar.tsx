import { useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Menu, X } from "lucide-react";

export const Navbar = () => {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    navigate("/");
    window.location.reload();
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isAdmin = user?.email === 'admin@coffee.com';

  return (
    <nav className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 bg-white border-b">
      <Link 
        to={user ? (isAdmin ? '/admin' : '/menu') : '/'} 
        className="font-bold text-xl text-[#8B5CF6]"
        onClick={() => setIsMenuOpen(false)}
      >
        Coffee Otomasyon
      </Link>

      <button 
        className="md:hidden p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#8B5CF6]"
        onClick={toggleMenu}
      >
        {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      <div className="hidden md:flex md:items-center md:gap-4">
        {user && (
          <>
            <Link to="/menu" className="text-sm hover:underline" onClick={() => setIsMenuOpen(false)}>
              Menü
            </Link>
            <Link to="/my-orders" className="text-sm hover:underline" onClick={() => setIsMenuOpen(false)}>
              Siparişlerim
            </Link>
            {isAdmin && (
              <Link to="/admin" className="text-sm hover:underline" onClick={() => setIsMenuOpen(false)}>
                Admin Paneli
              </Link>
            )}
            <span className="text-sm text-muted-foreground">({user.email})</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>Çıkış Yap</Button>
          </>
        )}
        {!user && (
          <Button size="sm" onClick={() => navigate('/login')}>Giriş Yap</Button>
        )}
      </div>

      {isMenuOpen && (
        <div className="w-full md:hidden mt-4 flex flex-col items-center gap-4 border-t pt-4">
          {user && (
            <>
             <Link to="/menu" className="text-sm hover:underline" onClick={toggleMenu}>
                Menü
              </Link>
              <Link to="/my-orders" className="text-sm hover:underline" onClick={toggleMenu}>
                Siparişlerim
              </Link>
              {isAdmin && (
                <Link to="/admin" className="text-sm hover:underline" onClick={toggleMenu}>
                  Admin Paneli
                </Link>
              )}
              <span className="text-sm text-muted-foreground">({user.email})</span>
              <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>Çıkış Yap</Button>
            </>
          )}
          {!user && (
            <Button size="sm" className="w-full" onClick={() => { navigate('/login'); toggleMenu(); }}>Giriş Yap</Button>
          )}
        </div>
      )}
    </nav>
  );
};
