import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import type { Database } from '../integrations/supabase/types';
import './CustomerPage.css'; // Stilleri import et
import { Input } from "@/components/ui/input"; // Input bileşenini import et
import { Label } from "@/components/ui/label"; // Label bileşenini import et
import { Button } from "@/components/ui/button"; // Button bileşenini import et
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"; // Sepet gösterimi için Card
import { X, Minus, Plus } from "lucide-react"; // Sepet ikonları
import { useNavigate } from 'react-router-dom'; // Yönlendirme için
import { useToast } from "@/components/ui/use-toast"; // Bildirim için
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Select'i import et
import { useQuery } from '@tanstack/react-query'; // useQuery'yi import et

// Supabase türlerinden coffee_products için Row türünü al
type Product = Database['public']['Tables']['coffee_products']['Row'];
type OrderInsert = Database['public']['Tables']['orders']['Insert'];
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];
type CafeTable = Database['public']['Tables']['cafe_tables']['Row']; // CafeTable tipini ekle

interface CartItem {
  product: Product;
  quantity: number;
}

// Aktif masaları çekme fonksiyonu
async function fetchActiveTables() {
    const { data, error } = await supabase
      .from('cafe_tables')
      .select('id, name') // Sadece id ve name yeterli
      .eq('is_active', true) // RLS zaten bunu yapıyor ama explicit olmak iyi
      .order('name', { ascending: true }); // İsim/numaraya göre sırala
    if (error) {
        console.error("Aktif masalar çekilirken hata:", error);
        throw error;
    }
    return data || [];
}

const CustomerPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isOrdering, setIsOrdering] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();

    // Ürünleri çekme useEffect'i
    useEffect(() => {
        const fetchProducts = async () => {
            setLoadingProducts(true);
            setError(null);
            try {
                const { data, error } = await supabase
                    .from('coffee_products')
                    .select('*')
                    .eq('is_available', true) // Sadece mevcut ürünleri getir
                    .order('created_at', { ascending: false }); // En yeni ürünler üstte

                if (error) {
                    throw error;
                }
                setProducts(data || []);
            } catch (err: unknown) { // 'any' yerine 'unknown' kullan
                console.error('Ürünler çekilirken hata:', err);
                // Hatanın 'Error' tipinde olup olmadığını kontrol et
                let errorMessage = 'Bilinmeyen bir hata oluştu.';
                if (err instanceof Error) {
                    errorMessage = err.message;
                }
                setError(`Ürünler yüklenemedi: ${errorMessage}`);
            } finally {
                setLoadingProducts(false);
            }
        };

        fetchProducts();
    }, []);

    // Masaları çekme query'si
    const { data: tables, isLoading: isLoadingTables } = useQuery<Pick<CafeTable, 'id' | 'name'>[]>({ 
        queryKey: ['activeCafeTables'], 
        queryFn: fetchActiveTables 
    });

    // Sepete Ekleme/Güncelleme Fonksiyonu
    const addToCart = (productToAdd: Product) => {
        setCart((prevCart) => {
            const existingItemIndex = prevCart.findIndex(
                (item) => item.product.id === productToAdd.id
            );
            if (existingItemIndex > -1) {
                // Ürün zaten sepette, adedini artır
                const updatedCart = [...prevCart];
                updatedCart[existingItemIndex] = {
                    ...updatedCart[existingItemIndex],
                    quantity: updatedCart[existingItemIndex].quantity + 1,
                };
                return updatedCart;
            } else {
                // Ürün sepette yok, yeni olarak ekle
                return [...prevCart, { product: productToAdd, quantity: 1 }];
            }
        });
    };

    // Sepetten Adet Azaltma Fonksiyonu
    const decreaseQuantity = (productId: string) => {
        setCart((prevCart) => {
            const itemIndex = prevCart.findIndex((item) => item.product.id === productId);
            if (itemIndex === -1) return prevCart; // Ürün yoksa dokunma

            const currentItem = prevCart[itemIndex];
            if (currentItem.quantity > 1) {
                // Adet 1'den fazlaysa azalt
                const updatedCart = [...prevCart];
                updatedCart[itemIndex] = { ...currentItem, quantity: currentItem.quantity - 1 };
                return updatedCart;
            } else {
                // Adet 1 ise ürünü sepetten çıkar
                return prevCart.filter((item) => item.product.id !== productId);
            }
        });
    };

    // Sepetten Ürün Çıkarma Fonksiyonu
    const removeFromCart = (productId: string) => {
        setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
    };

    // Sepet Toplamını Hesapla
    const calculateTotal = () => {
        return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
    };

    // Sipariş Verme Fonksiyonu
    const handlePlaceOrder = async () => {
        setIsOrdering(true);
        setError(null);

        // 1. Kullanıcı Giriş Kontrolü
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('Kullanıcı alınamadı veya giriş yapılmamış:', authError);
            toast({ title: "Hata", description: "Sipariş vermek için giriş yapmalısınız.", variant: "destructive" });
            setIsOrdering(false);
            // İsteğe bağlı: Giriş sayfasına yönlendir
            // navigate('/login'); 
            return;
        }

        // 2. Gerekli bilgiler var mı kontrol et (redundant ama güvenli)
        if (!selectedTable || cart.length === 0) {
             toast({ title: "Hata", description: "Lütfen bir masa seçin ve sepetinize ürün ekleyin.", variant: "destructive" });
            setIsOrdering(false);
            return;
        }

        // 3. Sipariş Verisini Hazırla
        const totalAmount = calculateTotal();
        const orderData: OrderInsert = {
            user_id: user.id,
            status: 'new', 
            total_price: totalAmount,
            table_number: selectedTable || null // Seçili masa adını kaydet
        };

        try {
            // 4. Ana Siparişi Ekle (orders tablosu)
            const { data: newOrder, error: orderError } = await supabase
                .from('orders')
                .insert(orderData)
                .select('id') // Eklenen siparişin ID'sini geri al
                .single(); // Tek bir kayıt beklediğimizi belirtir

            if (orderError || !newOrder) {
                console.error('Sipariş eklenirken hata:', orderError);
                throw new Error(orderError?.message || 'Ana sipariş kaydı oluşturulamadı.');
            }

            const orderId = newOrder.id;

            // 5. Sipariş Detaylarını Ekle (order_items tablosu)
            const orderItemsData: OrderItemInsert[] = cart.map(item => ({
                order_id: orderId,
                coffee_id: item.product.id,
                quantity: item.quantity,
                unit_price: item.product.price,
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsData);

            if (itemsError) {
                console.error('Sipariş detayları eklenirken hata:', itemsError);
                // !! Önemli: Ana sipariş oluştu ama detaylar eklenemedi.
                // Bu durumu ele almak gerekebilir (örn: ana siparişi silmek veya durumu 'hatalı' yapmak).
                // Şimdilik sadece hata mesajı gösteriyoruz.
                throw new Error(itemsError.message || 'Sipariş detayları kaydedilemedi.');
            }

            // 6. Başarılı: Bildirim göster, sepeti ve masa numarasını temizle
            toast({ title: "Başarılı!", description: "Siparişiniz başarıyla alındı." });
            setCart([]);
            setSelectedTable(''); // Seçili masayı temizle

        } catch (err: unknown) {
            console.error('Sipariş verme sürecinde hata:', err);
            let errorMessage = 'Siparişiniz alınırken bir hata oluştu.';
            if (err instanceof Error) {
                errorMessage = err.message;
            }
            // Genel hata mesajını göster
            setError(errorMessage); // Sayfanın üstünde de gösterilebilir
            toast({ title: "Sipariş Hatası", description: errorMessage, variant: "destructive" });
        } finally {
            setIsOrdering(false);
        }
    };

    return (
        // Ana konteyner: Padding eklendi (px-4 sm:px-6 lg:px-8)
        <div className="customer-page-container pb-32 px-4 sm:px-6 lg:px-8">
            {/* Başlık: Ortalanabilir veya sola hizalı kalabilir, padding eklendi */}
            <h1 className="text-3xl font-bold text-center my-6 text-[#8B5CF6]">Menü</h1>

            {/* Masa Seçimi Bölümü: Genişlik ve ortalama ayarlandı */}
            <div className="table-selection mb-8 w-full max-w-xs mx-auto">
                <Label htmlFor="table-select" className="block text-center mb-2 font-semibold">Masa Seçin</Label>
                {/* Select bileşenleri zaten genişliği ayarlıyor olmalı */}
                <Select 
                    value={selectedTable}
                    onValueChange={setSelectedTable}
                    disabled={isLoadingTables || tables?.length === 0}
                >
                    <SelectTrigger id="table-select" className="text-center">
                        <SelectValue placeholder={isLoadingTables ? "Masalar yükleniyor..." : "Masa seçin..."} />
                    </SelectTrigger>
                    <SelectContent>
                        {tables && tables.map((table) => (
                            <SelectItem key={table.id} value={table.name}>
                                {table.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Ürün Listesi Alanı */}
            {loadingProducts && <p className="text-center">Ürünler yükleniyor...</p>}
            {error && <p className="text-center text-red-600">{error}</p>}
            {/* Ürün Grid'i: Responsive sütunlar ve boşluklar */}
            <div className="product-list grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {!loadingProducts && !error && products.map((product) => (
                    // Ürün Kartı 
                    <Card key={product.id} className="flex flex-col overflow-hidden"> {/* overflow-hidden eklendi */}
                        {/* Resim Alanı */}
                        <div className="aspect-square w-full overflow-hidden"> {/* Resim için sabit oranlı alan */} 
                            <img
                                src={product.image_url || '/placeholder.svg'}
                                alt={product.name}
                                className="h-full w-full object-cover transition-transform duration-300 ease-in-out hover:scale-105" // object-cover ve hover efekti
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                                }}
                            />
                        </div>
                        {/* Kart İçeriği */}
                        <CardHeader className="pt-4 pb-2"> {/* Padding ayarlandı */}
                            <CardTitle className="text-base font-semibold">{product.name}</CardTitle> {/* Boyut ayarlandı */} 
                            {product.description && <p className="text-xs text-muted-foreground truncate">{product.description}</p>} {/* Boyut ve truncate */} 
                        </CardHeader>
                        <CardContent className="flex-grow py-1"> {/* Padding ayarlandı */} 
                            <span className="text-sm font-medium">{product.price} TL</span> {/* Boyut ayarlandı */} 
                        </CardContent>
                        <CardFooter className="pt-2 pb-4"> {/* Padding ayarlandı */} 
                            <Button className="w-full" onClick={() => addToCart(product)}>
                                Sepete Ekle
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* Sepet Özeti (Ekranın Altında Sabitlenebilir) */}
            {cart.length > 0 && (
                 // Sabitlenmiş sarmalayıcı
                <div className="cart-summary-fixed fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
                     {/* İçeriği sığdırmak için max genişlik ve ortalama */}
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-lg font-semibold mb-2">Sepetiniz</h2>
                        <div className="max-h-40 overflow-y-auto mb-2 pr-2"> {/* Sepet içeriği kaydırılabilir */} 
                            {cart.map((item) => (
                                <div key={item.product.id} className="flex justify-between items-center text-sm mb-1">
                                    <span>{item.product.name}</span>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => decreaseQuantity(item.product.id)}><Minus className="h-3 w-3"/></Button>
                                        <span>{item.quantity}</span>
                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => addToCart(item.product)}><Plus className="h-3 w-3"/></Button>
                                        <span>({(item.product.price * item.quantity).toFixed(2)} TL)</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeFromCart(item.product.id)}><X className="h-4 w-4"/></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center font-semibold border-t pt-2">
                            <span>Toplam: {calculateTotal().toFixed(2)} TL</span>
                            <Button 
                                onClick={handlePlaceOrder} 
                                disabled={!selectedTable || isOrdering} // Masa seçiliyse ve sipariş verilmiyorsa aktif
                            >
                                {isOrdering ? 'Sipariş Veriliyor...' : `Sipariş Ver (${selectedTable || 'Masa Seçin'})`}
                            </Button>
                        </div>
                        {!selectedTable && <p className="text-xs text-red-500 text-right mt-1">Sipariş vermek için lütfen bir masa seçin.</p>} 
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerPage; 