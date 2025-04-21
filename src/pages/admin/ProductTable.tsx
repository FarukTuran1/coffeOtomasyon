import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import ProductForm from "./ProductForm";

// Product tipini tanımla
type Product = Database["public"]["Tables"]["coffee_products"]["Row"];
type ProductInsert = Database["public"]["Tables"]["coffee_products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["coffee_products"]["Update"];

function fetchProducts() {
  return supabase
    .from("coffee_products")
    .select("*")
    .order("created_at", { ascending: false });
}

// Fonksiyonu async yap ve Promise döndür
async function deleteProduct(id: string) {
  // Supabase işlemi await ile beklenmeli
  const { error } = await supabase.from("coffee_products").delete().eq("id", id);
  if (error) {
    console.error("Ürün silinirken hata:", error);
    throw error; // Hata oluşursa mutation'a bildir
  }
  // Başarılı olursa bir şey döndürmeye gerek yok (veya başarı mesajı)
}

// Yeni ürün ekleme fonksiyonu
async function addProduct(productData: ProductInsert) {
  const { error } = await supabase.from("coffee_products").insert(productData);
  if (error) {
    console.error("Ürün eklenirken hata:", error);
    throw new Error(`Ürün eklenemedi: ${error.message}`); // Formda göstermek için hata fırlat
  }
}

// Ürün güncelleme fonksiyonu
async function updateProduct({ id, ...updateData }: { id: string } & ProductUpdate) {
  const { error } = await supabase
    .from("coffee_products")
    .update(updateData)
    .eq("id", id);
  if (error) {
    console.error("Ürün güncellenirken hata:", error);
    throw new Error(`Ürün güncellenemedi: ${error.message}`);
  }
}

export default function ProductTable() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data, isLoading, isError } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await fetchProducts();
      if (error) throw error;
      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      console.error("Silme işlemi başarısız:", error);
    }
  });

  const addMutation = useMutation({
    mutationFn: addProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsAddModalOpen(false);
    },
    onError: (error) => {
      console.error("Ekleme işlemi başarısız:", error);
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsEditModalOpen(false);
      setEditingProduct(null);
    },
    onError: (error) => {
      console.error("Güncelleme işlemi başarısız:", error);
    }
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const handleDelete = (id: string) => {
    setDeletingId(id);
    deleteMutation.mutate(id, {
      onSettled: () => setDeletingId(null),
    });
  };

  const handleAddSubmit = async (productData: ProductInsert) => {
    await addMutation.mutateAsync(productData);
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (updateData: ProductUpdate) => {
    if (!editingProduct) return;
    await updateMutation.mutateAsync({ id: editingProduct.id, ...updateData });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-semibold">Kahve Ürünleri</div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Yeni Ürün
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Kahve Ürünü Ekle</DialogTitle>
              <DialogDescription>
                Yeni ürünün bilgilerini giriniz.
              </DialogDescription>
            </DialogHeader>
            <ProductForm
              onSubmit={handleAddSubmit}
              onCancel={() => setIsAddModalOpen(false)}
              isLoading={addMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Adı</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Açıklama</TableHead>
              <TableHead>Fiyat (₺)</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Oluşturulma</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7}>Yükleniyor...</TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={7}>Ürünler yüklenemedi.</TableCell>
              </TableRow>
            )}
            {data &&
              data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.category ?? '-'}</TableCell>
                  <TableCell>{p.description ?? '-'}</TableCell>
                  <TableCell>{p.price}</TableCell>
                  <TableCell>
                    <Badge variant={p.is_available === true ? "default" : "destructive"}>
                      {p.is_available === true ? "Aktif" : "Pasif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(p.created_at).toLocaleDateString("tr-TR")}
                  </TableCell>
                  <TableCell className="text-right flex gap-1 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="mr-2"
                      disabled={updateMutation.isPending && editingProduct?.id === p.id}
                      title="Düzenle"
                      onClick={() => handleEditClick(p)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={deletingId === p.id || deleteMutation.isPending}
                      onClick={() => handleDelete(p.id)}
                    >
                      {deletingId === p.id ? "Siliniyor..." : <Trash className="w-4 h-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
        setIsEditModalOpen(isOpen);
        if (!isOpen) setEditingProduct(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ürünü Düzenle</DialogTitle>
            <DialogDescription>
              Ürün bilgilerini güncelleyiniz.
            </DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <ProductForm
              initialData={editingProduct}
              onSubmit={handleEditSubmit}
              onCancel={() => {
                setIsEditModalOpen(false);
                setEditingProduct(null);
              }}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
