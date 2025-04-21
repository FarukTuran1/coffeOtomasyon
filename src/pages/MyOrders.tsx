import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuthUser } from '@/hooks/useAuthUser'; // Kullanıcı bilgisini almak için
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';

// Tipler
type Order = Database['public']['Tables']['orders']['Row'];

// Kullanıcının siparişlerini çekme fonksiyonu
async function fetchMyOrders(userId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, created_at, total_price, status, table_number, user_id') // user_id eklendi
    .eq('user_id', userId) // Sadece bu kullanıcıya ait olanlar
    .order('created_at', { ascending: false }); // En yeniden eskiye

  if (error) {
    console.error("Siparişlerim çekilirken hata:", error);
    throw error;
  }
  return data || [];
}

const MyOrders: React.FC = () => {
  const { user, loading: authLoading } = useAuthUser();
  const navigate = useNavigate();

  // Kullanıcı giriş yapmamışsa veya yükleniyorsa farklı içerik göster
  useEffect(() => {
      if (!authLoading && !user) {
          navigate('/login'); // Giriş yapmamışsa login'e yönlendir
      }
  }, [user, authLoading, navigate]);

  const { 
      data: orders, 
      isLoading: ordersLoading, 
      isError, 
      error 
  } = useQuery<Order[], Error>({
    queryKey: ['myOrders', user?.id], // Kullanıcı ID'sine göre cache key
    queryFn: () => fetchMyOrders(user!.id), // user null değilse çalıştır
    enabled: !!user, // Sadece kullanıcı bilgisi varsa sorguyu çalıştır
  });

  const isLoading = authLoading || ordersLoading;

  if (isLoading) {
      return <div className="container mx-auto p-4">Yükleniyor...</div>;
  }

  if (!user) {
      // Bu durum useEffect tarafından yakalanmalı ama yine de kontrol
      return <div className="container mx-auto p-4">Giriş yapmalısınız.</div>; 
  }

  if (isError) {
      return <div className="container mx-auto p-4 text-red-500">Siparişler yüklenirken bir hata oluştu: {error.message}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Siparişlerim</h1>
      {orders.length === 0 ? (
        <p>Henüz hiç sipariş vermediniz.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden md:table-cell">Sipariş Tarihi</TableHead>
                <TableHead className="hidden md:table-cell">Masa No</TableHead>
                <TableHead>Toplam Tutar (₺)</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="hidden md:table-cell">{new Date(order.created_at).toLocaleString("tr-TR")}</TableCell>
                  <TableCell className="hidden md:table-cell">{order.table_number ?? '-'}</TableCell>
                  <TableCell>{order.total_price?.toFixed(2) ?? '0.00'}</TableCell>
                  <TableCell>
                    <Badge variant={ 
                        order.status === 'completed' ? 'default' : 
                        order.status === 'cancelled' ? 'destructive' : 
                        order.status === 'processing' ? 'secondary' : 
                        'default'
                    }>
                        {order.status ?? 'Bilinmiyor'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default MyOrders; 