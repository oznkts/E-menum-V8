# Vercel Troubleshooting Guide

## Kategori Oluşturma Hatası

### Olası Nedenler

1. **RLS Policy Violation**
   - Kullanıcının organization membership'i yok
   - Kullanıcının rolü yeterli değil (staff, manager, admin, owner olmalı)
   - Membership aktif değil

2. **Environment Variables Eksik**
   - `NEXT_PUBLIC_SUPABASE_URL` eksik veya yanlış
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` eksik veya yanlış
   - `SUPABASE_SERVICE_ROLE_KEY` eksik veya yanlış

3. **Veritabanı Bağlantı Sorunu**
   - Supabase Cloud projesi aktif değil
   - Network/firewall sorunu

### Çözüm Adımları

#### 1. Environment Variables Kontrolü

Vercel Dashboard'da kontrol edin:
- Settings > Environment Variables
- Şu değişkenlerin olduğundan emin olun:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

#### 2. Kullanıcı Membership Kontrolü

Supabase Dashboard'da kontrol edin:
- Table Editor > `memberships` tablosu
- Kullanıcının organization'da membership'i olduğundan emin olun
- Membership'in `is_active = true` olduğundan emin olun
- Kullanıcının rolünün `staff`, `manager`, `admin`, veya `owner` olduğundan emin olun

#### 3. Debug Script Çalıştırma

Local'de debug script'i çalıştırın:

```bash
# Production environment variables'ları ayarlayın
export NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Debug script'i çalıştırın
npx tsx scripts/debug-category-creation.ts <organization_id> <user_email>
```

#### 4. Vercel Function Logs Kontrolü

Vercel Dashboard'da:
- Deployments > Son deployment > Functions
- Category creation sırasında oluşan hataları kontrol edin

#### 5. Browser Console Kontrolü

Browser'da:
- Developer Tools > Console
- Network tab'ında failed request'leri kontrol edin
- Response body'deki hata mesajlarını kontrol edin

### Hızlı Test

Production'da test etmek için:

1. Supabase Dashboard > SQL Editor'de çalıştırın:

```sql
-- Kullanıcının membership'ini kontrol edin
SELECT 
  m.*,
  o.name as org_name,
  p.email as user_email
FROM memberships m
JOIN organizations o ON o.id = m.organization_id
JOIN profiles p ON p.id = m.user_id
WHERE p.email = 'user@example.com'
AND m.organization_id = 'your-org-id';
```

2. Eğer membership yoksa, oluşturun:

```sql
-- Membership oluştur (service role key ile)
INSERT INTO memberships (organization_id, user_id, role, is_active)
VALUES (
  'your-org-id',
  'user-id',
  'owner', -- veya 'admin', 'manager', 'staff'
  true
);
```

### Yaygın Hatalar

**"new row violates row-level security policy"**
- Çözüm: Kullanıcının membership'i ve rolünü kontrol edin

**"permission denied for table categories"**
- Çözüm: RLS policies'in doğru uygulandığından emin olun

**"Missing environment variables"**
- Çözüm: Vercel environment variables'ları kontrol edin

**"Network error" veya "Connection refused"**
- Çözüm: Supabase Cloud projesinin aktif olduğundan emin olun

