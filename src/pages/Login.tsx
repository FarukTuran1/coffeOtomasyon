import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast({ title: "Hata", description: error.message });
    } else {
      toast({ title: "Başarılı", description: "Giriş başarılı!" });

      // Kullanıcı rolü sorgusu (Varsayılan: "user", eğer yetkili ise "admin" rolünü veriyorsun)
      // Burada start: Supabase veritabanına bir 'role' alanı eklersen, bu alanı okuyabilirsin.
      // Şimdilik örnek olarak sadece email'e göre basit bir rol yönetimi:
      if (email === "admin@coffee.com") {
        navigate("/admin");
      } else {
        navigate("/menu");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#D6BCFA] to-[#F2FCE2] p-4">
      <form
        onSubmit={handleLogin}
        className="bg-white p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-sm flex flex-col gap-4"
      >
        <h2 className="text-2xl font-bold mb-2 text-center">Giriş Yap</h2>
        <Input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </Button>
        <div className="text-xs">Admin girişi için <b>admin@coffee.com</b> kullanabilirsiniz.</div>
        <p className="text-center text-sm mt-2">
            Hesabınız yok mu?{" "}
            <Link to="/signup" className="text-blue-600 hover:underline">
                 Kayıt Ol
            </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
