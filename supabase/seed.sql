-- =====================================================
-- E-Menum Demo Seed Data
-- Description: Realistic Turkish restaurant demo data
-- Usage: Run after migrations: supabase db seed OR npm run seed
-- =====================================================

-- =====================================================
-- IMPORTANT NOTES:
-- 1. This seed file assumes migrations have been run
-- 2. Demo user IDs are placeholders - will be created via auth
-- 3. Prices are in Turkish Lira (TRY) with realistic 2024/2025 values
-- 4. All content is in Turkish for authentic demo experience
-- =====================================================

-- =====================================================
-- DEMO USER (created via Supabase Auth, profile auto-created by trigger)
-- Email: demo@e-menum.com / Password: Demo123!
-- =====================================================

-- We'll use a placeholder UUID for the demo user
-- The actual user will be created via Supabase Auth
DO $$
DECLARE
  v_demo_user_id UUID;
  v_demo_org_id UUID := '00000000-0000-0000-0000-000000000101';
  v_demo_org2_id UUID := '00000000-0000-0000-0000-000000000102';

  -- Category IDs
  v_cat_kebap UUID := gen_random_uuid();
  v_cat_pide UUID := gen_random_uuid();
  v_cat_meze UUID := gen_random_uuid();
  v_cat_salata UUID := gen_random_uuid();
  v_cat_corba UUID := gen_random_uuid();
  v_cat_tatli UUID := gen_random_uuid();
  v_cat_icecek UUID := gen_random_uuid();
  v_cat_kahvalti UUID := gen_random_uuid();

  -- Product IDs (for modifiers and price ledger)
  v_prod_adana UUID := gen_random_uuid();
  v_prod_urfa UUID := gen_random_uuid();
  v_prod_beyti UUID := gen_random_uuid();
  v_prod_iskender UUID := gen_random_uuid();
  v_prod_pide UUID := gen_random_uuid();
  v_prod_lahmacun UUID := gen_random_uuid();
  v_prod_mercimek UUID := gen_random_uuid();
  v_prod_baklava UUID := gen_random_uuid();
  v_prod_ayran UUID := gen_random_uuid();
  v_prod_cay UUID := gen_random_uuid();

  -- Table IDs
  v_table_1 UUID := gen_random_uuid();
  v_table_2 UUID := gen_random_uuid();
  v_table_3 UUID := gen_random_uuid();
  v_table_4 UUID := gen_random_uuid();
  v_table_5 UUID := gen_random_uuid();
  v_table_vip UUID := gen_random_uuid();

BEGIN
  SELECT id INTO v_demo_user_id
  FROM auth.users
  WHERE email = 'demo@e-menum.com'
  LIMIT 1;

  -- If the demo auth user doesn't exist, skip seeding
  IF v_demo_user_id IS NULL THEN
    RAISE NOTICE 'Demo auth user not found; skipping demo data seeding.';
    RETURN;
  END IF;

  -- =====================================================
  -- DEMO ORGANIZATION 1: Traditional Turkish Restaurant
  -- =====================================================

  INSERT INTO organizations (
    id,
    name,
    slug,
    description,
    owner_id,
    subscription_tier,
    subscription_status,
    logo_url,
    primary_color,
    secondary_color,
    phone,
    email,
    website,
    address,
    city,
    district,
    postal_code,
    timezone,
    currency,
    language,
    business_hours,
    is_active
  ) VALUES (
    v_demo_org_id,
    'Anadolu Sofrasi',
    'anadolu-sofrasi',
    'Geleneksel Turk mutfaginin en guzel ornekleri. 1985''ten beri misafirlerimize annelerimizden ogrendigimiz tarifleri sunuyoruz. Taze malzemeler, odun atesi ve bol sevgiyle hazirlanan yemeklerimizle sizleri bekliyoruz.',
    v_demo_user_id,
    'gold',
    'active',
    NULL, -- Logo will be uploaded separately
    '#b91c1c', -- Turkish red
    '#991b1b',
    '+90 212 555 0101',
    'info@anadolusofrasi.com',
    'https://anadolusofrasi.com',
    'Istiklal Caddesi No: 123',
    'Istanbul',
    'Beyoglu',
    '34430',
    'Europe/Istanbul',
    'TRY',
    'tr',
    '{
      "monday": {"open": "11:00", "close": "23:00"},
      "tuesday": {"open": "11:00", "close": "23:00"},
      "wednesday": {"open": "11:00", "close": "23:00"},
      "thursday": {"open": "11:00", "close": "23:00"},
      "friday": {"open": "11:00", "close": "00:00"},
      "saturday": {"open": "10:00", "close": "00:00"},
      "sunday": {"open": "10:00", "close": "22:00"}
    }'::jsonb,
    true
  ) ON CONFLICT (id) DO NOTHING;

  -- =====================================================
  -- CATEGORIES for Anadolu Sofrasi
  -- =====================================================

  -- Kebaplar (Kebabs)
  INSERT INTO categories (id, organization_id, name, slug, description, icon, sort_order, is_visible)
  VALUES (
    v_cat_kebap, v_demo_org_id,
    'Kebaplar',
    'kebaplar',
    'Odun atesinde pisirilen geleneksel Turk kebaplari. Taze et ve ozenle hazirlanan baharatlarla.',
    'fire',
    1,
    true
  ) ON CONFLICT DO NOTHING;

  -- Pideler (Turkish Pide)
  INSERT INTO categories (id, organization_id, name, slug, description, icon, sort_order, is_visible)
  VALUES (
    v_cat_pide, v_demo_org_id,
    'Pideler',
    'pideler',
    'Firinda taze pisirilen acik ve kapali pideler. Karadeniz usulu hamur isi.',
    'pizza',
    2,
    true
  ) ON CONFLICT DO NOTHING;

  -- Mezeler (Appetizers)
  INSERT INTO categories (id, organization_id, name, slug, description, icon, sort_order, is_visible)
  VALUES (
    v_cat_meze, v_demo_org_id,
    'Mezeler',
    'mezeler',
    'Taze hazirlanan soguk ve sicak mezeler. Raki sofrasinin vazgecilmezleri.',
    'bowl-food',
    3,
    true
  ) ON CONFLICT DO NOTHING;

  -- Salatalar (Salads)
  INSERT INTO categories (id, organization_id, name, slug, description, icon, sort_order, is_visible)
  VALUES (
    v_cat_salata, v_demo_org_id,
    'Salatalar',
    'salatalar',
    'Taze sebzelerle hazirlanan mevsim salatalari.',
    'leaf',
    4,
    true
  ) ON CONFLICT DO NOTHING;

  -- Corbalar (Soups)
  INSERT INTO categories (id, organization_id, name, slug, description, icon, sort_order, is_visible)
  VALUES (
    v_cat_corba, v_demo_org_id,
    'Corbalar',
    'corbalar',
    'Gunluk taze hazirlanan ev yapimi corbalar.',
    'soup',
    5,
    true
  ) ON CONFLICT DO NOTHING;

  -- Tatlilar (Desserts)
  INSERT INTO categories (id, organization_id, name, slug, description, icon, sort_order, is_visible)
  VALUES (
    v_cat_tatli, v_demo_org_id,
    'Tatlilar',
    'tatlilar',
    'Geleneksel Turk tatlilari ve ev yapimi muhallebiler.',
    'cake',
    6,
    true
  ) ON CONFLICT DO NOTHING;

  -- Icecekler (Beverages)
  INSERT INTO categories (id, organization_id, name, slug, description, icon, sort_order, is_visible)
  VALUES (
    v_cat_icecek, v_demo_org_id,
    'Icecekler',
    'icecekler',
    'Soguk ve sicak icecekler, taze sikma meyve sulari.',
    'coffee',
    7,
    true
  ) ON CONFLICT DO NOTHING;

  -- Kahvalti (Breakfast) - available only until 12:00
  INSERT INTO categories (id, organization_id, name, slug, description, icon, sort_order, is_visible, available_from, available_until)
  VALUES (
    v_cat_kahvalti, v_demo_org_id,
    'Kahvalti',
    'kahvalti',
    'Geleneksel Turk kahvaltisi. Simit, peynir, bal, kaymak ve daha fazlasi.',
    'egg',
    0,
    true,
    '07:00',
    '12:00'
  ) ON CONFLICT DO NOTHING;

  -- =====================================================
  -- PRODUCTS - KEBAPLAR (Kebabs)
  -- =====================================================

  -- Adana Kebap
  INSERT INTO products (
    id, organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order, preparation_time_minutes,
    is_spicy, spicy_level, is_gluten_free, tags, is_featured
  ) VALUES (
    v_prod_adana, v_demo_org_id, v_cat_kebap,
    'Adana Kebap',
    'adana-kebap',
    'Ozenle secilmis kuzu etinden, el yapimi acili Adana usulu kebap. Yaninda pilav, közlenmis domates ve biber ile servis edilir. Pul biber ve maydanoz ile suslenir.',
    'Acili kuzu eti kebabi, yaninda pilav',
    195.00,
    'active',
    true,
    1,
    25,
    true,
    3,
    true,
    ARRAY['popular', 'spicy', 'chef-special'],
    true
  ) ON CONFLICT DO NOTHING;

  -- Urfa Kebap
  INSERT INTO products (
    id, organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order, preparation_time_minutes,
    is_spicy, spicy_level, is_gluten_free, tags
  ) VALUES (
    v_prod_urfa, v_demo_org_id, v_cat_kebap,
    'Urfa Kebap',
    'urfa-kebap',
    'Taze kuzu etinden hazirlanan, acisiz Urfa usulu kebap. Baharatli ama aci degil. Yaninda bulgur pilavi ve közlenmis sebzeler ile servis edilir.',
    'Acisiz kuzu eti kebabi, yaninda bulgur',
    185.00,
    'active',
    true,
    2,
    20,
    false,
    0,
    true,
    ARRAY['popular']
  ) ON CONFLICT DO NOTHING;

  -- Beyti Kebap
  INSERT INTO products (
    id, organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order, preparation_time_minutes,
    is_spicy, spicy_level, tags
  ) VALUES (
    v_prod_beyti, v_demo_org_id, v_cat_kebap,
    'Beyti Kebap',
    'beyti-kebap',
    'Kuzu etinden hazirlanan kebap, lavash ekmegiyle sarilip yogurt ve domates sosu ile servis edilir. Tereyagli pilav esliginde.',
    'Lavasli kebap, yogurt soslu',
    225.00,
    'active',
    true,
    3,
    30,
    true,
    2,
    ARRAY['chef-special', 'signature']
  ) ON CONFLICT DO NOTHING;

  -- Iskender Kebap
  INSERT INTO products (
    id, organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order, preparation_time_minutes,
    is_spicy, spicy_level, tags, is_featured
  ) VALUES (
    v_prod_iskender, v_demo_org_id, v_cat_kebap,
    'Iskender Kebap',
    'iskender-kebap',
    'Ince dilimli dana döner, özel pide ekmegi üzerine dizilir. Tereyagi ve domates sosu ile tatlandirilir, yaninda yogurt ile servis edilir. Bursa''nin meshur lezzeti.',
    'Döner, pide, yogurt, tereyagi soslu',
    245.00,
    'active',
    true,
    4,
    20,
    false,
    0,
    ARRAY['popular', 'signature', 'must-try'],
    true
  ) ON CONFLICT DO NOTHING;

  -- Kuzu Pirzola
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order, preparation_time_minutes,
    is_gluten_free, tags
  ) VALUES (
    v_demo_org_id, v_cat_kebap,
    'Kuzu Pirzola',
    'kuzu-pirzola',
    'Taze kuzu pirzolaları, közde pisirilir. Yaninda patates pureleri ve mevsim sebzeleri ile servis edilir.',
    'Közde kuzu pirzola, sebze garnisi',
    295.00,
    'active',
    true,
    5,
    25,
    true,
    ARRAY['premium']
  ) ON CONFLICT DO NOTHING;

  -- Tavuk Sis
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order, preparation_time_minutes,
    is_gluten_free, allergens, tags
  ) VALUES (
    v_demo_org_id, v_cat_kebap,
    'Tavuk Sis',
    'tavuk-sis',
    'Marine edilmis tavuk göğsü parçalari, siste közlenir. Yaninda pilav ve salata ile servis edilir.',
    'Marine tavuk, pilav ve salata',
    145.00,
    'active',
    true,
    6,
    20,
    true,
    ARRAY['dairy']::allergen_type[],
    ARRAY['light']
  ) ON CONFLICT DO NOTHING;

  -- =====================================================
  -- PRODUCTS - PIDELER (Turkish Pide)
  -- =====================================================

  -- Kiymali Pide
  INSERT INTO products (
    id, organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order, preparation_time_minutes,
    allergens, tags
  ) VALUES (
    v_prod_pide, v_demo_org_id, v_cat_pide,
    'Kiymali Pide',
    'kiymali-pide',
    'Taze yoğurulmuş hamur, özel baharatli dana kiymasi ile. Karadeniz usulu, odun firininda pisirilir.',
    'Dana kiymali, odun firininda',
    135.00,
    'active',
    true,
    1,
    20,
    ARRAY['gluten']::allergen_type[],
    ARRAY['popular']
  ) ON CONFLICT DO NOTHING;

  -- Kasarli Pide
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order, preparation_time_minutes,
    allergens, is_vegetarian, tags
  ) VALUES (
    v_demo_org_id, v_cat_pide,
    'Kasarli Pide',
    'kasarli-pide',
    'Bol kasarlı, acik pide. Istenirse yumurta ile.',
    'Kasarli acik pide',
    115.00,
    'active',
    true,
    2,
    15,
    ARRAY['gluten', 'dairy']::allergen_type[],
    true,
    ARRAY['vegetarian']
  ) ON CONFLICT DO NOTHING;

  -- Lahmacun
  INSERT INTO products (
    id, organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order, preparation_time_minutes,
    is_spicy, spicy_level, allergens, tags
  ) VALUES (
    v_prod_lahmacun, v_demo_org_id, v_cat_pide,
    'Lahmacun',
    'lahmacun',
    'Ince acilmis hamur üzerine baharatli kiyma harci. Maydanoz, limon ve ayran ile mükemmel uyum.',
    'Ince hamur, baharatli kiyma',
    75.00,
    'active',
    true,
    3,
    12,
    true,
    1,
    ARRAY['gluten']::allergen_type[],
    ARRAY['popular', 'quick']
  ) ON CONFLICT DO NOTHING;

  -- Karisik Pide
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order, preparation_time_minutes,
    allergens, tags
  ) VALUES (
    v_demo_org_id, v_cat_pide,
    'Karisik Pide',
    'karisik-pide',
    'Sucuk, kasar, sosis ve yumurta ile hazırlanan özel karisik pide.',
    'Sucuk, kasar, sosis, yumurta',
    155.00,
    'active',
    true,
    4,
    20,
    ARRAY['gluten', 'dairy', 'eggs']::allergen_type[],
    ARRAY['hearty']
  ) ON CONFLICT DO NOTHING;

  -- =====================================================
  -- PRODUCTS - MEZELER (Appetizers)
  -- =====================================================

  -- Humus
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order,
    is_vegan, is_vegetarian, is_gluten_free, allergens, tags
  ) VALUES (
    v_demo_org_id, v_cat_meze,
    'Humus',
    'humus',
    'Nohut ezilip tahin, limon suyu ve zeytinyagi ile harmanlanir. Üzerine sumak ve zeytinyagi gezdirilir.',
    'Tahinli nohut ezmesi',
    65.00,
    'active',
    true,
    1,
    true,
    true,
    true,
    ARRAY['sesame']::allergen_type[],
    ARRAY['vegan', 'healthy']
  ) ON CONFLICT DO NOTHING;

  -- Cacik
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order,
    is_vegetarian, is_gluten_free, allergens, tags
  ) VALUES (
    v_demo_org_id, v_cat_meze,
    'Cacik',
    'cacik',
    'Süzme yogurt, rendelenmis salatalik, sarimsak, kuru nane ve zeytinyagi ile.',
    'Yogurtlu salatalik',
    55.00,
    'active',
    true,
    2,
    true,
    true,
    ARRAY['dairy']::allergen_type[],
    ARRAY['vegetarian', 'refreshing']
  ) ON CONFLICT DO NOTHING;

  -- Patlican Salatasi
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order,
    is_vegan, is_vegetarian, is_gluten_free, tags
  ) VALUES (
    v_demo_org_id, v_cat_meze,
    'Patlican Salatasi',
    'patlican-salatasi',
    'Közlenmis patlican, sarimsak, zeytinyagi ve limon ile ezilir. Üzerine nar eksilmis.',
    'Közlenmis patlican ezmesi',
    70.00,
    'active',
    true,
    3,
    true,
    true,
    true,
    ARRAY['vegan', 'smoky']
  ) ON CONFLICT DO NOTHING;

  -- Sigara Boregi
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order,
    is_vegetarian, allergens, tags
  ) VALUES (
    v_demo_org_id, v_cat_meze,
    'Sigara Boregi',
    'sigara-boregi',
    'Ince yufka, beyaz peynir ve maydanoz ile sarılip kizartilir. 6 adet.',
    'Peynirli sigara boregi (6 adet)',
    85.00,
    'active',
    true,
    4,
    true,
    ARRAY['gluten', 'dairy', 'eggs']::allergen_type[],
    ARRAY['vegetarian', 'crispy']
  ) ON CONFLICT DO NOTHING;

  -- Meze Tabagi
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order,
    is_vegetarian, tags, is_featured
  ) VALUES (
    v_demo_org_id, v_cat_meze,
    'Karisik Meze Tabagi',
    'karisik-meze-tabagi',
    'Humus, cacik, patlican salatasi, haydari, atom ve acili ezme. 2 kisi için ideal.',
    '6 cesit meze, 2 kisilik',
    175.00,
    'active',
    true,
    5,
    true,
    ARRAY['sharing', 'best-value'],
    true
  ) ON CONFLICT DO NOTHING;

  -- =====================================================
  -- PRODUCTS - CORBALAR (Soups)
  -- =====================================================

  -- Mercimek Corbasi
  INSERT INTO products (
    id, organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order, preparation_time_minutes,
    is_vegan, is_vegetarian, is_gluten_free, tags
  ) VALUES (
    v_prod_mercimek, v_demo_org_id, v_cat_corba,
    'Mercimek Corbasi',
    'mercimek-corbasi',
    'Kirmizi mercimek, havuc, sogan ve baharatlar ile hazirlanan geleneksel Türk corbasi. Limon ve kuru ekmek ile servis edilir.',
    'Geleneksel mercimek corbasi',
    55.00,
    'active',
    true,
    1,
    10,
    true,
    true,
    true,
    ARRAY['vegan', 'comfort-food', 'daily']
  ) ON CONFLICT DO NOTHING;

  -- Ezogelin Corbasi
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order, preparation_time_minutes,
    is_vegetarian, is_spicy, spicy_level, allergens, tags
  ) VALUES (
    v_demo_org_id, v_cat_corba,
    'Ezogelin Corbasi',
    'ezogelin-corbasi',
    'Kirmizi mercimek, bulgur ve pirinc ile hazirlanan, hafif acili corba. Nane ve pul biber ile tatlandirilir.',
    'Mercimek, bulgur ve pirinc corbasi',
    60.00,
    'active',
    true,
    2,
    12,
    true,
    true,
    1,
    ARRAY['gluten']::allergen_type[],
    ARRAY['vegetarian', 'traditional']
  ) ON CONFLICT DO NOTHING;

  -- Iskembe Corbasi
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order, preparation_time_minutes,
    is_gluten_free, tags
  ) VALUES (
    v_demo_org_id, v_cat_corba,
    'Iskembe Corbasi',
    'iskembe-corbasi',
    'Geleneksel ishkembe corbasi. Sarimsak, sirke ve pul biber ile servis edilir.',
    'Klasik ishkembe, sarimsak soslu',
    75.00,
    'active',
    true,
    3,
    15,
    true,
    ARRAY['traditional', 'hearty']
  ) ON CONFLICT DO NOTHING;

  -- =====================================================
  -- PRODUCTS - TATLILAR (Desserts)
  -- =====================================================

  -- Baklava
  INSERT INTO products (
    id, organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order,
    allergens, tags, is_featured
  ) VALUES (
    v_prod_baklava, v_demo_org_id, v_cat_tatli,
    'Baklava',
    'baklava',
    'Gaziantep usulu fistikli baklava. Ince ince acilmis yufkalar arasinda bol antep fistigi. Kaymak ile servis edilir.',
    'Antep fistikli, 4 dilim',
    125.00,
    'active',
    true,
    1,
    ARRAY['gluten', 'nuts']::allergen_type[],
    ARRAY['signature', 'must-try'],
    true
  ) ON CONFLICT DO NOTHING;

  -- Künefe
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order, preparation_time_minutes,
    allergens, tags
  ) VALUES (
    v_demo_org_id, v_cat_tatli,
    'Kunefe',
    'kunefe',
    'Hatay usulu künefe. Kadayıf, özel peynir ve şerbet ile. Antep fıstığı ile süslenir.',
    'Sicak servis, fistikli',
    135.00,
    'active',
    true,
    2,
    15,
    ARRAY['gluten', 'dairy', 'nuts']::allergen_type[],
    ARRAY['hot-dessert', 'signature']
  ) ON CONFLICT DO NOTHING;

  -- Sutlac
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order,
    is_vegetarian, is_gluten_free, allergens, tags
  ) VALUES (
    v_demo_org_id, v_cat_tatli,
    'Firinda Sutlac',
    'firinda-sutlac',
    'Ev yapimi sütlaç, fırında kızartılmış. Tarçın ile servis edilir.',
    'Firinda, tarcin ile',
    75.00,
    'active',
    true,
    3,
    true,
    true,
    ARRAY['dairy']::allergen_type[],
    ARRAY['vegetarian', 'comfort-food']
  ) ON CONFLICT DO NOTHING;

  -- Kazandibi
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order,
    is_vegetarian, allergens, tags
  ) VALUES (
    v_demo_org_id, v_cat_tatli,
    'Kazandibi',
    'kazandibi',
    'Karamelize tabanlı muhallebi. Tavuk göğsü ile yapılan geleneksel Osmanlı tatlısı.',
    'Karamelize muhallebi',
    70.00,
    'active',
    true,
    4,
    true,
    ARRAY['dairy', 'gluten']::allergen_type[],
    ARRAY['vegetarian', 'traditional']
  ) ON CONFLICT DO NOTHING;

  -- =====================================================
  -- PRODUCTS - ICECEKLER (Beverages)
  -- =====================================================

  -- Ayran
  INSERT INTO products (
    id, organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order,
    is_vegetarian, is_gluten_free, allergens, tags
  ) VALUES (
    v_prod_ayran, v_demo_org_id, v_cat_icecek,
    'Ayran',
    'ayran',
    'Ev yapimi, kopuklu ayran. Taze yogurttan günlük yapilir.',
    'Ev yapimi, taze',
    25.00,
    'active',
    true,
    1,
    true,
    true,
    ARRAY['dairy']::allergen_type[],
    ARRAY['refreshing', 'traditional']
  ) ON CONFLICT DO NOTHING;

  -- Türk Cayi
  INSERT INTO products (
    id, organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order,
    is_vegan, is_vegetarian, is_gluten_free, tags
  ) VALUES (
    v_prod_cay, v_demo_org_id, v_cat_icecek,
    'Turk Cayi',
    'turk-cayi',
    'Demlik cayi, ince belli bardakta. Rize çayı, şekersiz servis edilir.',
    'Rize cayi, ince belli',
    15.00,
    'active',
    true,
    2,
    true,
    true,
    true,
    ARRAY['traditional', 'hot']
  ) ON CONFLICT DO NOTHING;

  -- Türk Kahvesi
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order,
    is_vegan, is_vegetarian, is_gluten_free, tags
  ) VALUES (
    v_demo_org_id, v_cat_icecek,
    'Turk Kahvesi',
    'turk-kahvesi',
    'Geleneksel usulde cezvede pisirilen Türk kahvesi. Yaninda lokum ile servis edilir.',
    'Cezvede pisirilen, lokumlu',
    45.00,
    'active',
    true,
    3,
    true,
    true,
    true,
    ARRAY['traditional', 'hot', 'signature']
  ) ON CONFLICT DO NOTHING;

  -- Limonata
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order,
    is_vegan, is_vegetarian, is_gluten_free, tags
  ) VALUES (
    v_demo_org_id, v_cat_icecek,
    'Ev Yapimi Limonata',
    'ev-yapimi-limonata',
    'Taze sikılmis limon, nane ve buz ile. Şekersiz de yapilabilir.',
    'Taze, naneli',
    35.00,
    'active',
    true,
    4,
    true,
    true,
    true,
    ARRAY['refreshing', 'homemade']
  ) ON CONFLICT DO NOTHING;

  -- Salgam Suyu
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order,
    is_vegan, is_vegetarian, is_gluten_free, is_spicy, spicy_level, tags
  ) VALUES (
    v_demo_org_id, v_cat_icecek,
    'Salgam Suyu',
    'salgam-suyu',
    'Adana usulü acılı şalgam suyu. Kebap yanında mükemmel.',
    'Acili, Adana usulu',
    30.00,
    'active',
    true,
    5,
    true,
    true,
    true,
    true,
    2,
    ARRAY['traditional', 'spicy']
  ) ON CONFLICT DO NOTHING;

  -- Cola & Gazli Icecekler
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order,
    is_vegan, is_vegetarian, is_gluten_free, tags
  ) VALUES (
    v_demo_org_id, v_cat_icecek,
    'Gazli Icecekler',
    'gazli-icecekler',
    'Cola, Fanta, Sprite - 330ml sise.',
    'Cola, Fanta, Sprite',
    30.00,
    'active',
    true,
    6,
    true,
    true,
    true,
    ARRAY['cold']
  ) ON CONFLICT DO NOTHING;

  -- =====================================================
  -- PRODUCTS - KAHVALTI (Breakfast)
  -- =====================================================

  -- Serpme Kahvalti
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order, preparation_time_minutes,
    is_vegetarian, allergens, tags, is_featured
  ) VALUES (
    v_demo_org_id, v_cat_kahvalti,
    'Serpme Kahvalti',
    'serpme-kahvalti',
    '2 kişilik zengin kahvaltı tabağı: Beyaz peynir, kaşar, tulum, bal, kaymak, tereyağı, zeytin, domates, salatalık, reçel çeşitleri, yumurta, sucuklu yumurta, simit, ekmek ve sınırsız çay.',
    '2 kisilik, zengin serpme',
    350.00,
    'active',
    true,
    1,
    20,
    true,
    ARRAY['gluten', 'dairy', 'eggs']::allergen_type[],
    ARRAY['sharing', 'must-try', 'weekend'],
    true
  ) ON CONFLICT DO NOTHING;

  -- Menemen
  INSERT INTO products (
    organization_id, category_id, name, slug, description, short_description,
    price, status, is_available, sort_order, preparation_time_minutes,
    is_vegetarian, is_gluten_free, allergens, tags
  ) VALUES (
    v_demo_org_id, v_cat_kahvalti,
    'Menemen',
    'menemen',
    'Domates, biber ve yumurta ile yapılan klasik Türk kahvaltısı. Tereyağında pişirilir, ekmek ile servis edilir.',
    'Domates, biber, yumurta',
    85.00,
    'active',
    true,
    2,
    10,
    true,
    true,
    ARRAY['eggs', 'dairy']::allergen_type[],
    ARRAY['vegetarian', 'classic']
  ) ON CONFLICT DO NOTHING;

  -- =====================================================
  -- PRODUCT MODIFIERS (for Adana Kebap)
  -- =====================================================

  -- Porsiyon Secimi (Size Selection)
  INSERT INTO product_modifiers (
    organization_id, product_id, name, description,
    is_required, min_selections, max_selections, sort_order
  )
  SELECT
    v_demo_org_id,
    v_prod_adana,
    'Porsiyon',
    'Kebap porsiyon boyutu secin',
    true,
    1,
    1,
    1
  WHERE NOT EXISTS (
    SELECT 1 FROM product_modifiers WHERE product_id = v_prod_adana AND name = 'Porsiyon'
  );

  -- Modifier options for Porsiyon
  INSERT INTO modifier_options (organization_id, modifier_id, name, price_adjustment, sort_order, is_default)
  SELECT
    v_demo_org_id,
    pm.id,
    'Yarim Porsiyon',
    -50.00,
    1,
    false
  FROM product_modifiers pm
  WHERE pm.product_id = v_prod_adana AND pm.name = 'Porsiyon'
  AND NOT EXISTS (
    SELECT 1 FROM modifier_options mo WHERE mo.modifier_id = pm.id AND mo.name = 'Yarim Porsiyon'
  );

  INSERT INTO modifier_options (organization_id, modifier_id, name, price_adjustment, sort_order, is_default)
  SELECT
    v_demo_org_id,
    pm.id,
    'Tam Porsiyon',
    0.00,
    2,
    true
  FROM product_modifiers pm
  WHERE pm.product_id = v_prod_adana AND pm.name = 'Porsiyon'
  AND NOT EXISTS (
    SELECT 1 FROM modifier_options mo WHERE mo.modifier_id = pm.id AND mo.name = 'Tam Porsiyon'
  );

  INSERT INTO modifier_options (organization_id, modifier_id, name, price_adjustment, sort_order, is_default)
  SELECT
    v_demo_org_id,
    pm.id,
    'Bir Bucuk Porsiyon',
    75.00,
    3,
    false
  FROM product_modifiers pm
  WHERE pm.product_id = v_prod_adana AND pm.name = 'Porsiyon'
  AND NOT EXISTS (
    SELECT 1 FROM modifier_options mo WHERE mo.modifier_id = pm.id AND mo.name = 'Bir Bucuk Porsiyon'
  );

  -- Ekstralar (Extras) for Adana
  INSERT INTO product_modifiers (
    organization_id, product_id, name, description,
    is_required, min_selections, max_selections, sort_order
  )
  SELECT
    v_demo_org_id,
    v_prod_adana,
    'Ekstralar',
    'Ekstra malzemeler secebilirsiniz',
    false,
    0,
    5,
    2
  WHERE NOT EXISTS (
    SELECT 1 FROM product_modifiers WHERE product_id = v_prod_adana AND name = 'Ekstralar'
  );

  INSERT INTO modifier_options (organization_id, modifier_id, name, price_adjustment, sort_order)
  SELECT
    v_demo_org_id,
    pm.id,
    'Ekstra Pilav',
    25.00,
    1
  FROM product_modifiers pm
  WHERE pm.product_id = v_prod_adana AND pm.name = 'Ekstralar'
  AND NOT EXISTS (
    SELECT 1 FROM modifier_options mo WHERE mo.modifier_id = pm.id AND mo.name = 'Ekstra Pilav'
  );

  INSERT INTO modifier_options (organization_id, modifier_id, name, price_adjustment, sort_order)
  SELECT
    v_demo_org_id,
    pm.id,
    'Közlenmis Biber',
    15.00,
    2
  FROM product_modifiers pm
  WHERE pm.product_id = v_prod_adana AND pm.name = 'Ekstralar'
  AND NOT EXISTS (
    SELECT 1 FROM modifier_options mo WHERE mo.modifier_id = pm.id AND mo.name = 'Közlenmis Biber'
  );

  INSERT INTO modifier_options (organization_id, modifier_id, name, price_adjustment, sort_order)
  SELECT
    v_demo_org_id,
    pm.id,
    'Yogurt',
    20.00,
    3
  FROM product_modifiers pm
  WHERE pm.product_id = v_prod_adana AND pm.name = 'Ekstralar'
  AND NOT EXISTS (
    SELECT 1 FROM modifier_options mo WHERE mo.modifier_id = pm.id AND mo.name = 'Yogurt'
  );

  -- =====================================================
  -- RESTAURANT TABLES for Anadolu Sofrasi
  -- =====================================================

  INSERT INTO restaurant_tables (id, organization_id, name, table_number, section, floor, capacity, sort_order, status)
  VALUES
    (v_table_1, v_demo_org_id, 'Masa 1', '1', 'Ic Mekan', 1, 4, 1, 'available'),
    (v_table_2, v_demo_org_id, 'Masa 2', '2', 'Ic Mekan', 1, 4, 2, 'available'),
    (v_table_3, v_demo_org_id, 'Masa 3', '3', 'Ic Mekan', 1, 2, 3, 'available'),
    (v_table_4, v_demo_org_id, 'Masa 4', '4', 'Ic Mekan', 1, 6, 4, 'available'),
    (v_table_5, v_demo_org_id, 'Masa 5', '5', 'Bahce', 1, 4, 5, 'available'),
    (v_table_vip, v_demo_org_id, 'VIP Salon', 'VIP', 'VIP', 2, 12, 6, 'available')
  ON CONFLICT DO NOTHING;

  -- =====================================================
  -- DEMO ORGANIZATION 2: Modern Cafe
  -- =====================================================

  INSERT INTO organizations (
    id,
    name,
    slug,
    description,
    owner_id,
    subscription_tier,
    subscription_status,
    primary_color,
    secondary_color,
    phone,
    email,
    address,
    city,
    district,
    timezone,
    currency,
    language,
    is_active
  ) VALUES (
    v_demo_org2_id,
    'Kahve Duragi',
    'kahve-duragi',
    'Modern Turk kahve kulturu. Üçüncü dalga kahve, ev yapimi tatlilar ve rahat ortam.',
    v_demo_user_id,
    'lite',
    'trialing',
    '#78350f',
    '#451a03',
    '+90 216 555 0202',
    'info@kahveduragi.com',
    'Bagdat Caddesi No: 456',
    'Istanbul',
    'Kadikoy',
    'Europe/Istanbul',
    'TRY',
    'tr',
    true
  ) ON CONFLICT (id) DO NOTHING;

  -- Categories for Kahve Duragi (simplified)
  INSERT INTO categories (organization_id, name, slug, description, sort_order, is_visible)
  VALUES
    (v_demo_org2_id, 'Kahveler', 'kahveler', 'Özel harman kahvelerimiz', 1, true),
    (v_demo_org2_id, 'Sicak Icecekler', 'sicak-icecekler', 'Cay, bitki caylari, sicak cikolata', 2, true),
    (v_demo_org2_id, 'Soguk Icecekler', 'soguk-icecekler', 'Buzlu kahve, frappe, smoothie', 3, true),
    (v_demo_org2_id, 'Tatlilar', 'tatlilar', 'Ev yapimi kurabiye, kek ve pasta', 4, true)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Demo data seeded successfully!';
  RAISE NOTICE 'Demo Organization 1: Anadolu Sofrasi (slug: anadolu-sofrasi)';
  RAISE NOTICE 'Demo Organization 2: Kahve Duragi (slug: kahve-duragi)';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error seeding demo data: %', SQLERRM;
    RAISE;
END $$;

-- =====================================================
-- HELPFUL QUERIES FOR TESTING
-- =====================================================

-- View all demo organizations:
-- SELECT id, name, slug, subscription_tier FROM organizations;

-- View menu for Anadolu Sofrasi:
-- SELECT c.name as category, p.name, p.price, p.is_available
-- FROM products p
-- JOIN categories c ON p.category_id = c.id
-- WHERE p.organization_id = (SELECT id FROM organizations WHERE slug = 'anadolu-sofrasi')
-- ORDER BY c.sort_order, p.sort_order;

-- View tables:
-- SELECT name, section, capacity, status FROM restaurant_tables
-- WHERE organization_id = (SELECT id FROM organizations WHERE slug = 'anadolu-sofrasi');

-- Test public menu access:
-- SELECT * FROM organizations WHERE slug = 'anadolu-sofrasi' AND is_active = true;
