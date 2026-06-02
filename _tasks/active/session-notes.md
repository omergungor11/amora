# Session Notları — Amora (AI Dating App)

## 2026-06-02

### Bu session'da yapılanlar
- **Canlı URL durumu netleştirildi:** Henüz deploy edilmiş URL yok; uygulama
  sadece lokalde çalışıyordu (web :5173, chat API :8787).
- **Firebase Hosting deploy hazırlığı:** `firebase.json` + `.firebaserc`
  (proje `date-app-37fce`) oluşturuldu, prod build alındı (`dist/`).
  Karar: web ücretsiz Firebase Hosting'e, chat backend'i sonraya bırakıldı.
  Kullanıcı `firebase login` yaptı (✓). **Deploy henüz tamamlanmadı** —
  komut yanlış dizinden (`~`) çalıştırıldı; proje dizininden tekrar lazım.
- **P2 — Ekonomi sistemi (TAMAMLANDI):**
  - `src/store/useEconomy.ts` — günlük beğeni kotası (30/gün, yerel gece yarısı
    sıfırlanır), Süper Beğeni + Boost kredileri, Premium bayrağı.
    localStorage + Firestore (`users/{uid}/meta/economy`).
  - `src/lib/db.ts` — `saveEconomy`/`loadEconomy` + `EconomyRow`.
  - `src/components/UpsellSheet.tsx` — paywall (like bitti / süper beğeni / mağaza),
    paketler 3/5/15 + Boost, Premium kartı, satın alma stub'ı.
  - `ActionBar` kredi rozetleri, `SwipeDeck` gate (buton yolu) + `SwipeCard`
    gate (drag yolu, `canSwipe`/`onBlocked`), `sync.ts` hydrate.
  - Playwright ile doğrulandı.
- **P3 — Premium & gelişmiş filtreler (TAMAMLANDI):**
  - `types.ts` — `UserProfile.filters` + `FilterKey`.
  - `lib/compatibility.ts` — `passesFilters` (hard gate) + `activeFilterCount`.
  - `src/components/AdvancedFilters.tsx` — yaşam tarzı/değerler/ilgi alanları
    çoklu seçim; free'de bulanık + kilit overlay → upsell.
  - `DiscoverySheet` entegrasyonu; `SwipeDeck`'te premium'da filtre uygulanıyor.
  - `src/components/LikedYouSheet.tsx` — "Seni Beğenenler"; free blurlu teaser,
    premium gerçek kartlar + dokun → anında eşleşme. `SwipeScreen`'de 💜 butonu.
  - `UpsellSheet`'e Free vs Premium karşılaştırma tablosu.
  - Playwright ile doğrulandı.
- Plan dokümanı güncellendi: `docs/plans/2026-05-31-discovery-monetization.md`
  P1/P2/P3 ✅ olarak işaretlendi.
- `dist/` P3 dahil yeniden build edildi.

### Yarım kalan / sıradaki işler
1. **Deploy'u tamamla** (kullanıcı çalıştıracak — login interaktif):
   `cd /Users/arlec/Work-Restored/ai-dating-app && npx -y firebase-tools deploy --only hosting`
   → canlı URL: `https://date-app-37fce.web.app`
2. **Chat backend'i canlıya al** — şu an deploy'da karakterler canned (hazır)
   mesajlarla yazışır, AI üretimi yok. Seçenekler: Vercel free function /
   Firebase Blaze (Cloud Functions). `server/index.ts` taşınmalı.
3. **P4 — Gerçek ödeme** (Stripe / RevenueCat): satın almalar şu an stub.

### Dikkat edilecek noktalar
- Firebase web config + Gemini anon key public by design; güvenlik Firestore
  Rules ile (`firestore.rules`).
- Gemini free-tier (15 RPM) yoğun testte 429 veriyor — quota-bilinçli test.
- CI yok: her deploy öncesi `npm run build` ile `dist/` güncellenmeli.
- **Proje git deposu DEĞİL** — commit/push yapılamıyor (init edilmedi).
- Deploy'da AI chat çalışmaz (backend host edilene kadar).
