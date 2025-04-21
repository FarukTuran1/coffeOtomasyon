import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import OrderDetailsModal from "./OrderDetailsModal";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type OrderWithProfile = Order & {
  profiles: Pick<Profile, 'name'> | null;
};

async function fetchOrdersWithProfiles() {
  const { data: ordersData, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (ordersError) {
    console.error("Siparişler çekilirken hata:", ordersError);
    throw ordersError;
  }
  if (!ordersData) return [];

  const userIds = ordersData.map(o => o.user_id).filter(id => id !== null) as string[];

  let profilesData: Pick<Profile, 'id' | 'name'>[] = [];
  if (userIds.length > 0) {
      const { data: profilesResult, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);

      if (profilesError) {
          console.error("Profiller çekilirken hata:", profilesError);
      } else {
          profilesData = profilesResult || [];
      }
  }

  const profilesMap = new Map(profilesData.map(p => [p.id, { name: p.name }]));

  const ordersWithProfiles = ordersData.map(order => ({
    ...order,
    profiles: order.user_id ? (profilesMap.get(order.user_id) || null) : null
  }));

  return ordersWithProfiles;
}

async function updateOrderStatus({ id, status }: { id: string; status: string }) {
    const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id);
    if (error) {
        console.error('Sipariş durumu güncellenirken hata:', error);
        throw new Error(`Sipariş durumu güncellenemedi: ${error.message}`);
    }
}

export default function OrderTable() {
  const queryClient = useQueryClient();

  const { data: orders, isLoading, isError } = useQuery<OrderWithProfile[]>({
    queryKey: ["ordersWithProfiles"],
    queryFn: fetchOrdersWithProfiles,
  });

  const updateStatusMutation = useMutation({
      mutationFn: updateOrderStatus,
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["ordersWithProfiles"] });
      },
      onError: (error) => {
          console.error("Durum güncelleme başarısız:", error);
      }
  });

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const handleStatusChange = (orderId: string, newStatus: string) => {
      if (!newStatus) return;
      updateStatusMutation.mutate({ id: orderId, status: newStatus });
  };

  const handleViewDetailsClick = (orderId: string) => {
      setSelectedOrderId(orderId);
      setIsDetailsModalOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-semibold">Siparişler</div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden lg:table-cell">Sipariş ID</TableHead>
              <TableHead>Müşteri Adı</TableHead>
              <TableHead className="hidden md:table-cell">Masa No</TableHead>
              <TableHead className="hidden md:table-cell">Tarih</TableHead>
              <TableHead>Tutar (₺)</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="lg:col-span-7 md:col-span-6">Yükleniyor...</TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={5} className="lg:col-span-7 md:col-span-6">Siparişler yüklenemedi.</TableCell>
              </TableRow>
            )}
            {orders && orders.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="lg:col-span-7 md:col-span-6">Henüz sipariş bulunmuyor.</TableCell>
                </TableRow>
            )}
            {orders &&
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="hidden lg:table-cell font-mono text-xs">{order.id}</TableCell>
                  <TableCell>{order.profiles?.name ?? (order.user_id ? `ID: ${order.user_id.substring(0, 8)}...` : 'Bilinmiyor')}</TableCell>
                  <TableCell className="hidden md:table-cell">{order.table_number ?? '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">{new Date(order.created_at).toLocaleString("tr-TR")}</TableCell>
                  <TableCell>{order.total_price ?? 0} TL</TableCell>
                  <TableCell>
                    <Select 
                      defaultValue={order.status ?? 'new'}
                      onValueChange={(newStatus) => handleStatusChange(order.id, newStatus)}
                      disabled={updateStatusMutation.isPending && updateStatusMutation.variables?.id === order.id}
                    >
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Durum Seç" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Yeni</SelectItem>
                        <SelectItem value="processing">Hazırlanıyor</SelectItem>
                        <SelectItem value="completed">Tamamlandı</SelectItem>
                        <SelectItem value="cancelled">İptal Edildi</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetailsClick(order.id)}
                    >
                      <Eye className="w-4 h-4 lg:mr-1" />
                      <span className="hidden lg:inline">Detaylar</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Sipariş Detayları Modalı */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sipariş Detayları (ID: {selectedOrderId?.substring(0, 8)}...)</DialogTitle>
          </DialogHeader>
          {selectedOrderId && <OrderDetailsModal orderId={selectedOrderId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
