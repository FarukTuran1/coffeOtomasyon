import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.email === "admin@coffee.com") {
        navigate("/admin");
      } else {
        navigate("/user");
      }
    }
  }, [user, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 animate-fade-in p-4">
      <div className="text-center bg-white p-8 sm:p-12 rounded-2xl shadow-lg flex flex-col gap-6 w-full max-w-md">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-[#8B5CF6]">Coffee Otomasyonu</h1>
        <p className="text-lg sm:text-xl text-gray-600 mb-4">Lütfen giriş yaparak devam edin.</p>
        <Button className="w-full" onClick={() => navigate("/login")}>Giriş Yap</Button>
      </div>
    </div>
  );
};

export default Index;
