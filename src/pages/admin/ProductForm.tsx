import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Database } from '@/integrations/supabase/types';

// Tip tanımları
type ProductInsert = Database['public']['Tables']['coffee_products']['Insert'];

interface ProductFormProps {
  onSubmit: (productData: ProductInsert) => Promise<void>; // Asenkron işlem için Promise
  onCancel: () => void;
  initialData?: ProductInsert | null; // Düzenleme için (şimdilik kullanılmıyor)
  isLoading?: boolean; // Mutation yüklenme durumu
}

const ProductForm: React.FC<ProductFormProps> = ({ onSubmit, onCancel, initialData = null, isLoading = false }) => {
  // Form state yönetimi
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [price, setPrice] = useState<number | string>(initialData?.price ?? '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [imageUrl, setImageUrl] = useState(initialData?.image_url || '');
  const [isAvailable, setIsAvailable] = useState(initialData?.is_available ?? true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basit validasyon
    if (!name || price === '' || price === null || price === undefined) {
      setError('Ürün adı ve fiyatı zorunludur.');
      return;
    }
    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      setError('Geçerli bir fiyat giriniz.');
      return;
    }

    const productData: ProductInsert = {
      name,
      description: description || null,
      price: numericPrice,
      category: category || null,
      image_url: imageUrl || null,
      is_available: isAvailable,
    };

    try {
      await onSubmit(productData);
    } catch (err) {
      console.error("Form gönderilirken hata:", err);
      setError(err instanceof Error ? err.message : 'Ürün kaydedilemedi.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Ürün Adı *</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} />
      </div>
      <div>
        <Label htmlFor="description">Açıklama</Label>
        <Textarea id="description" value={description ?? ''} onChange={(e) => setDescription(e.target.value)} disabled={isLoading} />
      </div>
      <div>
        <Label htmlFor="price">Fiyat (₺) *</Label>
        <Input id="price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required disabled={isLoading} />
      </div>
      <div>
        <Label htmlFor="category">Kategori</Label>
        <Input id="category" value={category ?? ''} onChange={(e) => setCategory(e.target.value)} disabled={isLoading} />
      </div>
      <div>
        <Label htmlFor="imageUrl">Resim URL</Label>
        <Input id="imageUrl" value={imageUrl ?? ''} onChange={(e) => setImageUrl(e.target.value)} disabled={isLoading} />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="isAvailable" checked={isAvailable} onCheckedChange={(checked) => setIsAvailable(Boolean(checked))} disabled={isLoading} />
        <Label htmlFor="isAvailable">Satışta</Label>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          İptal
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </div>
    </form>
  );
};

export default ProductForm; 