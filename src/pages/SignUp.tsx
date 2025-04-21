import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
        toast({ title: "Hata", description: "Şifreler eşleşmiyor!", variant: "destructive" });
        return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });
    setLoading(false);

    if (error) {
      toast({ title: "Kayıt Hatası", description: error.message, variant: "destructive" });
    } else if (data.user) {
        if (data.user.identities?.length === 0) { 
             toast({ title: "Başarılı!", description: "Kayıt başarılı. Lütfen e-postanızı kontrol ederek hesabınızı onaylayın." });
             navigate('/login');
        } else {
            toast({ title: "Başarılı!", description: "Kayıt başarılı! Giriş yapabilirsiniz." });
            navigate('/login');
        }
    } else {
         toast({ title: "Bilinmeyen Hata", description: "Kayıt sırasında bir sorun oluştu.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#a8dadc] to-[#f1faee] p-4">
      <form
        onSubmit={handleSignUp}
        className="bg-white p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-sm flex flex-col gap-4"
      >
        <h2 className="text-2xl font-bold mb-2 text-center">Kayıt Ol</h2>
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
        <Input
          type="password"
          placeholder="Şifre Tekrar"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Kayıt olunuyor..." : "Kayıt Ol"}
        </Button>
        <p className="text-center text-sm mt-2">
            Zaten hesabınız var mı?{" "}
            <Link to="/login" className="text-blue-600 hover:underline">
                 Giriş Yap
            </Link>
        </p>
      </form>
    </div>
  );
};

export default SignUp; 