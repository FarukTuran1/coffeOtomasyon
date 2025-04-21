import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Coffee, BarChart, User, Archive } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthUser } from "@/hooks/useAuthUser";

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthUser();

  const menuItems = [
    {
      label: "Kahve Ürünleri",
      icon: Coffee,
      path: "/admin?tab=products",
    },
    {
      label: "Siparişler",
      icon: BarChart,
      path: "/admin?tab=orders",
    },
  ];

  // Sadece admin'e kullanıcılar tab
  if (user?.email === "admin@coffee.com") {
    menuItems.push({
      label: "Kullanıcılar",
      icon: User,
      path: "/admin?tab=users",
    });
    menuItems.push({
      label: "Masalar",
      icon: Archive,
      path: "/admin?tab=tables",
    });
  }

  return (
    <Sidebar>
      <SidebarHeader className="font-bold text-xl text-[#8B5CF6] px-3 py-2">
        Coffee Otomasyon
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Yönetim</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.search.includes(item.path.split("?tab=")[1])}
                    onClick={() => navigate(item.path)}
                  >
                    <div className="flex items-center cursor-pointer">
                      <item.icon className="mr-2" />
                      <span>{item.label}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="text-xs text-muted-foreground px-2 py-4">
          © 2025 Coffee Otomasyon
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
