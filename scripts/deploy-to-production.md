# Vercel Production Deployment Guide

## Vercel'de Veritabanını Güncelleme

### 1. Supabase Cloud'a Migration'ları Push Etme

```bash
# 1. Supabase CLI'ye login olun
npx supabase login

# 2. Supabase Cloud projenize link edin
npx supabase link --project-ref YOUR_PROJECT_REF

# 3. Migration'ları push edin
npx supabase db push
```

**Not:** `YOUR_PROJECT_REF` değerini Supabase Dashboard'dan alabilirsiniz:
- Supabase Dashboard > Project Settings > General > Reference ID

### 2. Vercel Environment Variables Kontrolü

Vercel Dashboard'da şu environment variables'ların olduğundan emin olun:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Bu değerleri nereden bulabilirsiniz:**
- Supabase Dashboard > Project Settings > API
- `Settings` > `API` > `Project URL` ve `anon public` key

### 3. Vercel'de Redeploy

Environment variables güncellendikten sonra:
1. Vercel Dashboard > Your Project > Settings > Environment Variables
2. Değişiklikleri kaydedin
3. Deployments > Redeploy

### 4. Supabase Cloud'da Storage Buckets Oluşturma

Supabase Dashboard > Storage'da şu bucket'ları oluşturun:

| Bucket Name | Access | Purpose |
|-------------|--------|---------|
| `product-images` | Public | Product/menu item images |
| `organization-assets` | Private | Restaurant logos, covers |

### 5. Supabase Cloud'da Auth Ayarları

Supabase Dashboard > Authentication > Settings:

- **Site URL**: Vercel deployment URL'iniz (örn: `https://your-app.vercel.app`)
- **Redirect URLs**: 
  - `https://your-app.vercel.app/**`
  - `https://your-app.vercel.app/auth/callback`

### 6. Superadmin Kullanıcısı Oluşturma (Production)

Production'da superadmin oluşturmak için:

```bash
# Environment variables'ları production değerleriyle ayarlayın
export NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# Superadmin oluştur
npx tsx scripts/create-superadmin.ts admin@e-menum.com Admin123! "Super Admin"
```

**ÖNEMLİ:** Production'da güçlü bir şifre kullanın!

### 7. Migration Durumunu Kontrol Etme

```bash
# Supabase Cloud'daki migration'ları kontrol et
npx supabase migration list --linked

# Migration'ları tekrar push etmek isterseniz
npx supabase db push
```

### 8. Sorun Giderme

**Veritabanı bağlantı hatası:**
- Environment variables'ların doğru olduğundan emin olun
- Supabase Dashboard'da projenin aktif olduğunu kontrol edin

**Migration hataları:**
- Migration'ları sırayla push edin
- Supabase Dashboard > Database > Migrations'da durumu kontrol edin

**Auth çalışmıyor:**
- Site URL ve Redirect URLs'in doğru olduğundan emin olun
- Email confirmation ayarlarını kontrol edin

