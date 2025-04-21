import { useAuthUser } from "@/hooks/useAuthUser";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const UserPanel = () => {
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();

  if (loading) return <div>Yükleniyor...</div>;
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div>Lütfen giriş yapınız.</div>
        <Button className="mt-4" onClick={() => navigate("/")}>Girişe Dön</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-[#FDE1D3] py-6 text-center text-3xl font-bold shadow">
        Kullanıcı Paneli
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-4 sm:p-6 lg:p-8 text-center">
        <div className="text-xl">Hoşgeldin, {user.email}. Sipariş vermek için aşağıdan kahveni seçebilirsin.</div>
        {/* Kahve ve sipariş özellikleri bir sonraki adımda buraya eklenecek */}
      </div>
    </div>
  );
};

export default UserPanel;
