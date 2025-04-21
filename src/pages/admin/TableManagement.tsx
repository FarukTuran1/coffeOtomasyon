import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

// Tip tanımları
type CafeTable = Database['public']['Tables']['cafe_tables']['Row'];
type CafeTableInsert = Database['public']['Tables']['cafe_tables']['Insert'];

// Fonksiyonlar
async function fetchCafeTables() {
  const { data, error } = await supabase
    .from('cafe_tables')
    .select('*')
    .order('created_at', { ascending: true }); // Eskiden yeniye sırala
  if (error) throw error;
  return data || [];
}

async function addCafeTable(tableData: CafeTableInsert) {
  const { error } = await supabase.from('cafe_tables').insert(tableData);
  if (error) {
      console.error("Masa eklenirken hata:", error);
      throw new Error(`Masa eklenemedi: ${error.message}`);
  }
}

async function deleteCafeTable(id: string) {
  const { error } = await supabase.from('cafe_tables').delete().eq('id', id);
  if (error) {
      console.error("Masa silinirken hata:", error);
      throw new Error(`Masa silinemedi: ${error.message}`);
  }
}

const TableManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newTableName, setNewTableName] = useState('');

  const { 
      data: tables, 
      isLoading,
      isError 
  } = useQuery<CafeTable[]>({ 
      queryKey: ['cafeTables'], 
      queryFn: fetchCafeTables 
  });

  const addMutation = useMutation({
    mutationFn: addCafeTable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cafeTables'] });
      setNewTableName(''); // Input'u temizle
      toast({ title: "Başarılı", description: "Masa başarıyla eklendi." });
    },
    onError: (error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
      mutationFn: deleteCafeTable,
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['cafeTables'] });
          toast({ title: "Başarılı", description: "Masa başarıyla silindi." });
      },
      onError: (error) => {
          toast({ title: "Hata", description: error.message, variant: "destructive" });
      }
  });

  const handleAddTable = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTableName.trim()) {
          toast({ title: "Hata", description: "Masa adı boş olamaz.", variant: "destructive" });
          return;
      }
      addMutation.mutate({ name: newTableName.trim() }); // Sadece ismi gönderiyoruz
  };

  return (
    <div>
      <div className="text-lg font-semibold mb-4">Masa Yönetimi</div>

      {/* Yeni Masa Ekleme Formu */}
      <form onSubmit={handleAddTable} className="flex items-center gap-2 mb-6">
        <Input 
          placeholder="Yeni Masa Adı/No" 
          value={newTableName}
          onChange={(e) => setNewTableName(e.target.value)}
          disabled={addMutation.isPending}
          className="max-w-xs"
        />
        <Button type="submit" disabled={addMutation.isPending || !newTableName.trim()}>
          <Plus className="w-4 h-4 mr-1" /> {addMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
        </Button>
      </form>

      {/* Masa Listesi */}
      <div className="overflow-x-auto">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Masa Adı/No</TableHead>
                    <TableHead>Oluşturulma Tarihi</TableHead>
                    {/* <TableHead>Durum</TableHead> İsteğe bağlı aktif/pasif */} 
                    <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading && (
                    <TableRow><TableCell colSpan={3}>Yükleniyor...</TableCell></TableRow>
                )}
                {isError && (
                    <TableRow><TableCell colSpan={3}>Masalar yüklenemedi.</TableCell></TableRow>
                )}
                {tables && tables.length === 0 && (
                    <TableRow><TableCell colSpan={3}>Henüz tanımlanmış masa yok.</TableCell></TableRow>
                )}
                {tables && tables.map((table) => (
                    <TableRow key={table.id}>
                        <TableCell>{table.name}</TableCell>
                        <TableCell>{new Date(table.created_at).toLocaleDateString("tr-TR")}</TableCell>
                        <TableCell className="text-right">
                            <Button 
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteMutation.mutate(table.id)}
                                disabled={deleteMutation.isPending && deleteMutation.variables === table.id}
                            >
                                <Trash className="w-4 h-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </div>

    </div>
  );
};

export default TableManagement; 