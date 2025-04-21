import { useSearchParams } from "react-router-dom";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import ProductTable from "@/pages/admin/ProductTable";
import OrderTable from "@/pages/admin/OrderTable";
import UserTable from "@/pages/admin/UserTable";
import TableManagement from "@/pages/admin/TableManagement";

const AdminPanel = () => {
  const { user, loading } = useAuthUser();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "products";

  if (loading) return <div>Yükleniyor...</div>;

  if (!user || user.email !== "admin@coffee.com") {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div>Yetkisiz giriş. Lütfen admin hesabı ile giriş yapınız.</div>
        <Button className="mt-4" onClick={() => window.location.href = "/"}>Girişe Dön</Button>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#F2FCE2]">
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center border-b px-6 py-4 bg-white shadow-sm">
            <SidebarTrigger />
            <div className="text-2xl font-semibold text-[#8B5CF6] ml-2">Admin Paneli</div>
          </div>
          <div className="p-6">
            {tab === "products" && <ProductTable />}
            {tab === "orders" && <OrderTable />}
            {tab === "users" && <UserTable />}
            {tab === "tables" && <TableManagement />}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminPanel;
