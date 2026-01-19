# Sipariş Dashboard - Supabase + Vercel

Modern sipariş yönetim sistemi. Supabase (veritabanı + auth) ve Vercel (hosting) kullanır.

## 🚀 Kurulum

### 1. Supabase Projesi Oluşturma

1. [Supabase](https://supabase.com) hesabı oluşturun
2. Yeni proje oluşturun
3. SQL Editor'e gidin ve `supabase/schema.sql` dosyasındaki SQL'i çalıştırın
4. Authentication > Users'dan bir kullanıcı ekleyin (email + password)

### 2. Environment Variables

`frontend/.env` dosyası oluşturun:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Bu değerleri Supabase Dashboard > Project Settings > API'dan alabilirsiniz.

### 3. Yerel Geliştirme

```bash
cd frontend
npm install
npm run dev
```

Uygulama http://localhost:5173 adresinde açılacaktır.

### 4. Vercel'e Deploy

1. GitHub'a projeyi push edin
2. [Vercel](https://vercel.com) hesabınıza giriş yapın
3. "New Project" > GitHub reposunu seçin
4. Root Directory: `frontend`
5. Environment Variables ekleyin:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL` (aynı değer)
   - `SUPABASE_SERVICE_ROLE_KEY` (Supabase Dashboard'dan - PDF/Excel API için)
6. Deploy!

## 📁 Proje Yapısı

```
siparisDashboard/
├── frontend/                 # React + Vite frontend
│   ├── api/                  # Vercel Edge Functions
│   │   ├── pdf/[id].ts      # PDF oluşturma
│   │   └── excel/[id].ts    # Excel oluşturma
│   ├── src/
│   │   ├── components/      # UI bileşenleri
│   │   ├── lib/             # API ve utility fonksiyonları
│   │   ├── pages/           # Sayfa bileşenleri
│   │   └── store/           # State yönetimi
│   └── vercel.json          # Vercel yapılandırması
└── supabase/
    └── schema.sql           # Veritabanı şeması
```

## 🔐 Güvenlik

- Row Level Security (RLS) aktif - sadece giriş yapmış kullanıcılar veri görebilir
- Supabase Auth ile güvenli kimlik doğrulama
- Environment variables ile API anahtarları korunuyor

## 📱 Özellikler

- ✅ Sipariş oluşturma ve yönetme
- ✅ Müşteri yönetimi
- ✅ Taş cinsi ve özellik yönetimi
- ✅ M² ve Metretül hesaplama
- ✅ PDF ve Excel export
- ✅ İskonto ve KDV hesaplama
- ✅ Responsive tasarım
- ✅ Gerçek zamanlı dashboard istatistikleri
