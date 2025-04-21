# Cozy Cafe Control Center

Bu proje, bir kahve dükkanı otomasyon sistemi için geliştirilmiş bir web uygulamasıdır. Müşterilerin menüyü görüntülemesine, sipariş vermesine ve kendi siparişlerini takip etmesine olanak tanır. Ayrıca, admin kullanıcıların ürünleri, siparişleri, kullanıcıları ve masaları yönetebileceği bir admin paneli içerir.

Proje [Vite](https://vitejs.dev/), [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/) ve [shadcn/ui](https://ui.shadcn.com/) kullanılarak oluşturulmuştur. Backend hizmetleri için [Supabase](https://supabase.com) kullanılmaktadır.

## Özellikler

*   **Müşteri Arayüzü:**
    *   Menü Görüntüleme (Ürünler ve Fiyatlar)
    *   Sepete Ürün Ekleme/Çıkarma/Adet Güncelleme
    *   Masa Seçimi
    *   Sipariş Verme
    *   Geçmiş Siparişleri Görüntüleme (`/my-orders`)
*   **Admin Paneli (`/admin`):**
    *   Ürün Yönetimi (Ekleme/Düzenleme/Silme)
    *   Sipariş Yönetimi (Listeleme, Durum Güncelleme, Detay Görüntüleme)
    *   Kullanıcı Yönetimi (Listeleme, Rol Güncelleme - user/admin)
    *   Masa Yönetimi (Ekleme/Silme)
*   Kullanıcı Giriş/Kayıt Sistemi (Supabase Auth)
*   Admin Rolü ile Rota Koruma
*   Responsive Tasarım

## Kurulum ve Çalıştırma

Projeyi yerel makinenizde çalıştırmak için aşağıdaki adımları takip edin:

**1. Projeyi Klonlama:**

```bash
git clone <BU_REPOSITORININ_URLSI>
cd cozy-cafe-control-center # Veya proje klasörünün adı
```

**2. Bağımlılıkları Yükleme:**

Node.js ve npm (veya yarn/pnpm) kurulu olmalıdır.

```bash
npm install
# veya
yarn install
# veya
pnpm install
```

**3. Supabase Kurulumu:**

Bu projenin çalışması için bir Supabase projesine ihtiyacınız var.

*   Eğer hesabınız yoksa [supabase.com](https://supabase.com) adresinden ücretsiz bir hesap oluşturun.
*   Supabase dashboard'unda yeni bir proje oluşturun.
*   Proje Ayarları (Project Settings) > API bölümünden **Project URL** ve **anon Public Key** değerlerini kopyalayın.
*   Aşağıdaki SQL sorgularını Supabase projenizdeki SQL Editor'de çalıştırarak gerekli tabloları oluşturun:

    ```sql
    -- Profiles Tablosu (Kullanıcı rolleri vb.)
    -- Supabase Auth ile otomatik oluşturulan kullanıcılarla eşleşir
    create table profiles (
      id uuid references auth.users not null primary key,
      name text,
      role text default 'user',
      created_at timestamptz default timezone('utc'::text, now()) not null
    );
    alter table profiles enable row level security;
    -- Yeni kullanıcılar için otomatik profil oluşturma trigger'ı (Opsiyonel ama önerilir)
    create function public.handle_new_user() 
    returns trigger as $$
    begin
      insert into public.profiles (id, name, role) -- İsim başlangıçta null olabilir
      values (new.id, new.raw_user_meta_data->>'full_name', 'user');
      return new;
    end;
    $$ language plpgsql security definer;
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();

    -- Ürünler Tablosu
    create table coffee_products (
      id uuid default gen_random_uuid() primary key,
      name text not null,
      description text,
      price numeric not null check (price >= 0),
      category text,
      image_url text,
      is_available boolean default true not null,
      created_at timestamptz default timezone('utc'::text, now()) not null
    );
    alter table coffee_products enable row level security;

    -- Masalar Tablosu
    create table cafe_tables (
      id uuid default gen_random_uuid() primary key,
      name text not null unique,
      is_active boolean default true not null,
      created_at timestamptz default timezone('utc'::text, now()) not null
    );
    alter table cafe_tables enable row level security;

    -- Siparişler Tablosu
    create table orders (
      id uuid default gen_random_uuid() primary key,
      user_id uuid references auth.users on delete set null, -- Kullanıcı silinirse sipariş kalsın
      status text default 'new' not null, -- new, processing, completed, cancelled
      total_price numeric check (total_price >= 0),
      table_number text, -- Masa adı/numarası
      created_at timestamptz default timezone('utc'::text, now()) not null
    );
    alter table orders enable row level security;

    -- Sipariş Kalemleri Tablosu
    create table order_items (
      id uuid default gen_random_uuid() primary key,
      order_id uuid references orders on delete cascade not null, -- Sipariş silinirse kalemler de silinsin
      coffee_id uuid references coffee_products on delete set null, -- Ürün silinirse null olsun
      quantity integer not null check (quantity > 0),
      unit_price numeric not null check (unit_price >= 0),
      created_at timestamptz default timezone('utc'::text, now()) not null
    );
    alter table order_items enable row level security;

    -- RLS Politikaları (ÖRNEK - Kendi projenize göre özelleştirin!)

    -- Yardımcı Fonksiyon: Mevcut kullanıcının rolünü getirir (Admin politikaları için kullanılır)
    CREATE OR REPLACE FUNCTION public.get_my_role()
    RETURNS TEXT AS $$
    DECLARE
      user_role TEXT;
    BEGIN
      -- Mevcut kullanıcının profilinden rolü seç
      -- RLS'yi geçici olarak atlamak için SECURITY DEFINER kullanılır
      SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
      RETURN user_role;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Herkesin aktif ürünleri ve masaları okuyabilmesi:
    create policy "Allow public read access to products" on coffee_products for select using (is_available = true);
    create policy "Allow public read access to tables" on cafe_tables for select using (is_active = true);
    -- Giriş yapmış kullanıcıların profilini okuyabilmesi:
    create policy "Allow individual read access to profiles" on profiles for select using (auth.uid() = id);
    -- Giriş yapmış kullanıcıların kendi siparişlerini okuyabilmesi:
    create policy "Allow individual read access to orders" on orders for select using (auth.uid() = user_id);
    create policy "Allow individual read access to order items" on order_items for select using (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
    -- Giriş yapmış kullanıcıların yeni sipariş oluşturabilmesi:
    create policy "Allow individual insert for orders" on orders for insert with check (auth.uid() = user_id);
    create policy "Allow individual insert for order items" on order_items for insert with check (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));

    -- Admin rolündeki kullanıcıların her şeyi yapabilmesi (GÜNCELLENDİ - Yardımcı fonksiyon kullanılıyor):
    create policy "Allow admin full access" on profiles for all
      using (public.get_my_role() = 'admin');
    create policy "Allow admin full access" on coffee_products for all
      using (public.get_my_role() = 'admin');
    create policy "Allow admin full access" on cafe_tables for all
      using (public.get_my_role() = 'admin');
    create policy "Allow admin full access" on orders for all
      using (public.get_my_role() = 'admin');
    create policy "Allow admin full access" on order_items for all
      using (public.get_my_role() = 'admin');
    ```

*   **Önemli:** Yukarıdaki RLS politikaları sadece örnektir. Projenizin güvenlik ihtiyaçlarına göre bunları dikkatlice gözden geçirin ve düzenleyin.

**4. Ortam Değişkenlerini Ayarlama:**

Proje kök dizininde `.env.example` dosyasını kopyalayarak `.env` adında yeni bir dosya oluşturun. Ardından, 3. adımda Supabase'den aldığınız değerleri bu dosyaya girin:

```env
VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL_HERE
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE
```

**5. Uygulamayı Çalıştırma:**

```bash
npm run dev
# veya
yarn dev
# veya
pnpm dev
```

Uygulama varsayılan olarak `http://localhost:5173` adresinde çalışacaktır.

## Admin Erişimi

Varsayılan olarak, `admin@coffee.com` e-postası ile giriş yapan kullanıcı admin paneline erişebilir. Bu e-posta adresini veya admin rolü atama mantığını kod içinden (örn: `Login.tsx` veya `AdminRoute.tsx`) veya Supabase tabloları/RLS politikaları üzerinden değiştirebilirsiniz.

**Not:** Gerçek bir uygulamada, kullanıcı rollerini doğrudan e-postaya bağlamak yerine Supabase `profiles` tablosundaki `role` sütunu üzerinden yönetmek daha güvenli ve esnektir. Yukarıdaki SQL ve RLS örnekleri bu yapıya bir başlangıç sunmaktadır.
