import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Tipleri tanımla
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type Product = Database['public']['Tables']['coffee_products']['Row'];

// order_items ve ilişkili ürün bilgilerini içeren tip
type OrderItemWithProduct = Pick<OrderItem, 'quantity' | 'unit_price'> & {
  coffee_products: Pick<Product, 'name'> | null; // Ürün bilgisi null olabilir (silinmişse vs.)
};

interface OrderDetailsModalProps {
  orderId: string;
}

// Belirli bir siparişin detaylarını çekme fonksiyonu
async function fetchOrderDetails(orderId: string) {
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      quantity,
      unit_price,
      coffee_products ( name ) 
    `)
    .eq('order_id', orderId);

  if (error) {
    console.error(`Sipariş detayları (${orderId}) çekilirken hata:`, error);
    throw error;
  }
  // Tipi belirt
  return data as OrderItemWithProduct[];
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ orderId }) => {
  const { 
    data: details, 
    isLoading, 
    isError, 
    error 
  } = useQuery<OrderItemWithProduct[], Error>({
    queryKey: ['orderDetails', orderId], // orderId'yi key'e ekle, her sipariş için ayrı cache
    queryFn: () => fetchOrderDetails(orderId),
    enabled: !!orderId, // orderId varsa sorguyu çalıştır
  });

  if (isLoading) {
    return <div>Detaylar yükleniyor...</div>;
  }

  if (isError) {
    return <div className="text-red-500">Detaylar yüklenemedi: {error.message}</div>;
  }

  if (!details || details.length === 0) {
    return <div>Bu siparişe ait ürün bulunamadı.</div>;
  }

  // Toplam tutarı hesapla (isteğe bağlı)
  const totalAmount = details.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  return (
    <div className="mt-4">
        {/* Tabloyu sarmalayan div */}
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Ürün Adı</TableHead>
                        <TableHead className="text-center">Adet</TableHead>
                        <TableHead className="text-right">Birim Fiyat (₺)</TableHead>
                        <TableHead className="text-right">Ara Toplam (₺)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {details.map((item, index) => (
                        <TableRow key={index}> 
                            <TableCell>{item.coffee_products?.name ?? 'Bilinmeyen Ürün'}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">{item.unit_price.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{(item.quantity * item.unit_price).toFixed(2)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
        {/* Toplam tutar kısmı */}
        <div className="text-right font-semibold mt-4">
            Toplam Tutar: {totalAmount.toFixed(2)} ₺
        </div>
    </div>
  );
};

export default OrderDetailsModal; 