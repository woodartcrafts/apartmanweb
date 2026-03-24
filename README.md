# ApartmanWeb

Apartman yonetimi icin full-stack web uygulamasi.

Bu README, projeyi sifirdan kurmak, gunluk gelistirme yapmak, raporlari dogru yorumlamak ve kritik operasyonlari guvenli sekilde yonetmek icin detayli bir teknik rehberdir.

## 1. Uygulama Amaci

ApartmanWeb su ihtiyaclari tek panelde toplar:
- Rol bazli giris (`ADMIN`, `RESIDENT`)
- Daire ve blok yonetimi
- Tahakkuk olusturma, duzeltme, kapatma mantigi
- Tahsilat ve gider islemleri
- Banka ekstresi importu ve otomatik eslestirme
- Operasyonel raporlar ve kontrol ekranlari
- Audit log + geri alma (undo)

## 2. Teknoloji Yigini

- Backend: `Node.js`, `TypeScript`, `Express`, `Prisma`, `Zod`
- Database: `PostgreSQL`
- Frontend: `React`, `TypeScript`, `Vite`, `react-router-dom`
- Authentication: `JWT`

## 3. Klasor Yapisi

```txt
apartmanweb/
	prisma/
		schema.prisma
		migrations/
	src/
		app.ts
		server.ts
		config.ts
		db.ts
		middlewares/
			auth.ts
		routes/
			auth.ts
			admin.ts
			resident.ts
		scripts/
			seedAdmin.ts
			seedApartmentsAndResidents.ts
			seedChargeTypes.ts
			seedExpenseItems.ts
			seedPaymentMethods.ts
	scripts/
		dev-diagnose.ps1
		restart-api.ps1
	frontend/
		src/
			App.tsx
			index.css
			main.tsx
			app/shared.ts
```

## 4. Roller ve Yetki Sinirlari

### `ADMIN`
- Tum yonetim islemlerini yapar.
- Daire, blok, tahakkuk, odeme, gider, import, rapor ve sistem duzeltmelerini yonetir.

### `RESIDENT`
- Sadece kendi dairesinin ekstre ve iliskili gorunumlerine erisir.

## 5. Cekirdek Is Kurallari

- Tahakkuk durumu `OPEN` veya `CLOSED` olur.
- Tahakkuk sadece odeme dagitimi borcu kapattiysa `CLOSED` olur.
- Odeme/gider kaydinda secilen odeme yontemi aktif degilse islem engellenir.
- Importta duplicate referans kontrolleri vardir.
- Audit/undo, admin degisikliklerini sinirli sure geri alma imkaniyla kaydeder.
- Login endpointinde hiz siniri vardir (brute-force korumasi).
- Auth token hem `Authorization: Bearer ...` hem de `httpOnly` cookie ile desteklenir.
- CORS sadece izinli origin listesi icin aciktir.
- Frontend API cagrilarinda `credentials: include` kullanilir; oturum cookie tabanli olarak tasinir.

## 6. Veri Modeli Ozeti

Onemli modeller:
- `Block`
- `Apartment`
- `User`
- `Charge`
- `ChargeTypeDefinition`
- `Payment`
- `PaymentItem`
- `Expense`
- `ExpenseItemDefinition`
- `PaymentMethodDefinition`
- `ImportBatch`
- `DescriptionDoorNoRule`
- `DescriptionExpenseRule`
- `AuditActionLog`

Onemli enumlar:
- `UserRole`: `ADMIN`, `RESIDENT`
- `ApartmentType`: `KUCUK`, `BUYUK`
- `OccupancyType`: `OWNER`, `TENANT`
- `ChargeStatus`: `OPEN`, `CLOSED`
- `PaymentMethod`: `BANK_TRANSFER`, `CASH`, `CREDIT_CARD`, `OTHER`
- `ImportBatchType`: `PAYMENT_UPLOAD`, `BANK_STATEMENT_UPLOAD`

`Apartment` ek alanlari:
- Iletisim: `email1-3`, `phone1-3`
- Oturum: `occupancyType`, `ownerFullName`
- Ev sahibi: `landlordFullName`, `landlordPhone`, `landlordEmail`
- Ozellik bayraklari: `hasAidat`, `hasDogalgaz`, `hasOtherDues`, `hasIncome`, `hasExpenses`

## 7. Ortam Degiskenleri

### Backend (`.env`)
- `DATABASE_URL`
- `JWT_SECRET`
- `PORT` (opsiyonel, default `3000`)
- `ALLOWED_ORIGINS` (opsiyonel, virgulle ayrilmis origin listesi; default `http://localhost:5173`)
- `AUTH_RATE_LIMIT_WINDOW_MS` (opsiyonel, default `900000`)
- `AUTH_RATE_LIMIT_MAX_ATTEMPTS` (opsiyonel, default `5`)

Opsiyonel seed degiskenleri:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_FULLNAME`
- `BLOCK_NAME`
- `RESIDENT_EMAIL_DOMAIN`
- `RESIDENT_DEFAULT_PASSWORD`

### Frontend (`frontend/.env`)
- `VITE_API_BASE_URL` (ornek: `http://localhost:3000`)

## 8. Kurulum ve Calistirma

### 8.1 Backend kurulum

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
```

Opsiyonel seed:

```bash
npm run seed:admin
npm run seed:charge-types
npm run seed:expense-items
npm run seed:payment-methods
npm run seed:residents
```

Backend calistirma:

```bash
npm run dev
```

Hizli ve guvenli lokal acilis (Windows):

```bash
npm run dev:local
```

API: `http://localhost:3000`

### 8.2 Frontend kurulum

```bash
cd frontend
npm install
npm run dev
```

Alternatif (root'tan):

```bash
npm run dev:frontend
```

UI: `http://localhost:5173`

## 9. Komut Referansi

Root komutlari:
- `npm run dev`: Backend watch mode
- `npm run dev:local`: Port 3000 bosalt + backend baslat
- `npm run dev:frontend`: Frontend dev helper
- `npm run check:api`: `GET /health` kontrolu
- `npm run restart:api`: Port temizle + API restart + health check
- `npm run doctor:dev`: Cevresel teshis (port/prisma/build/api)
- `npm run build`: Backend TS build
- `npm run start`: Production backend
- `npm run test`, `npm run test:watch`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:deploy`
- `npm run prisma:studio`

Frontend komutlari (`frontend/`):
- `npm run dev`
- `npm run dev:local`
- `npm run build`
- `npm run lint`
- `npm run preview`

## 10. API Ozet Haritasi

Prefixler:
- Auth: `/api/auth`
- Admin: `/api/admin`
- Resident: `/api/resident`

Temel endpointler:
- `POST /api/auth/login`
- `GET /api/resident/me/statement`

Admin gruplari:
- Daire/Blok CRUD
- Tanimlar: charge type, payment method, expense item
- Tahakkuk islemleri
- Odeme/gider kayit ve duzeltmeleri
- Import preview/commit ve upload batch yonetimi
- Raporlar
- Audit log + undo

## 11. Frontend Navigasyon

Admin ust menu:
- `DR`: Daire ve blok
- `TH`: Tahakkuk
- `OD`: Odeme
- `EK`: Ekstre
- `GD`: Gider
- `RP`: Raporlar
- `BN`: Bankalar
- `SD`: Sistem ve duzeltme

## 12. Raporlar ve Hesaplama Notlari

### 12.1 Referans arama (`/admin/reports/reference-search`)

- Referans numarasina gore tahsilat/gider hareketlerini listeler.
- Tahsilat satirinda duzeltme sirasinda daire degisikligi desteklenir.
- Daire degisikliginde `PaymentItem` baglantilari hedef dairenin borclarina yeniden dagitilir.
- Islem sonunda eski ve yeni iliskili tahakkuklarin `OPEN/CLOSED` durumlari yeniden hesaplanir.

### 12.2 Aylik bakiye matrisi (`/admin/reports/monthly-balance-matrix`)

- Aylik kolonlar secilen yilin ay bazli odenmeyen durumunu gosterir.
- Son kolon (`Rapor Tarihi Gecikmis`) raporun calistigi andaki (`snapshotAt`) vadesi gecmis ve odenmemis toplami verir.
- UI'da rapor tarihi ayrica gosterilir.
- `Rapor Tarihi Gecikmis > 200 TL` olan satirlarin arka plani kirmizi tonla vurgulanir.

### 12.3 Gecikmis odemeler

- Manuel sorgu modeli vardir (`Calistir` ile veri gelir).
- `dueDate < now` ve borcu kalan satirlar odaklidir.

## 13. Import Akisi (Banka Ekstresi)

- `.xls/.xlsx` satirlari parse edilir.
- Pozitif satirlar tahsilat, negatif satirlar gider olarak degerlendirilir.
- Daire tespiti aciklama kurallariyla (`DescriptionDoorNoRule`) yapilabilir.
- Gider kalemi aciklama kurallariyla (`DescriptionExpenseRule`) secilebilir.
- Duplicate referans kontrolleri uygulanir.
- Sonuc `ImportBatch` ile izlenir (created/skipped bilgileri dahil).

## 14. Audit ve Undo

- Odeme/gider duzeltme ve silme islemleri audit kaydina duser.
- Uygun tipteki kayitlar belirli zaman penceresinde geri alinabilir.
- Undo durumlari admin panelinden izlenebilir.

## 15. Sorun Giderme

### 15.1 API baglantisi yok (`localhost:3000`)

```powershell
npm run check:api
npm run restart:api
```

Port kontrolu:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object LocalPort, OwningProcess
```

### 15.2 Frontend port sorunu (`5173`)

```powershell
cd frontend
npm run dev:local
```

### 15.3 Prisma tip/uretim problemleri

```bash
npx prisma generate
```

### 15.4 Railway baglanti notu

- Lokal ortamda `*.railway.internal` host kullanilmaz.
- Public Railway URL veya lokal PostgreSQL kullanin.

### 15.5 Windows `EPERM` / Prisma engine lock

- API calisirken Prisma generate/migrate sirasinda lock olusabilir.
- Port 3000 surecini kapatip komutu tekrar calistirin.

## 16. Deployment (Railway) - Test Ortami Rehberi

Bu proje Railway'de iki servis olarak deploy edilir:
- API servisi (root klasor: `apartmanweb/`)
- Frontend servisi (root klasor: `apartmanweb/frontend/`)

Domain almadan Railway'in verdigi public URL'ler ile test edebilirsiniz.

### 16.1 API servisi (Backend)

1. Railway'de yeni bir service olusturun, repo'yu baglayin.
2. Service root directory olarak repo kokunu kullanin.
3. Bu repoda hazir gelen `railway.json` (kok klasor) otomatik build/start komutlarini uygular.
4. API service env degiskenlerini girin:

- `DATABASE_URL` (Railway PostgreSQL baglantisi)
- `JWT_SECRET` (guclu bir gizli anahtar)
- `PORT=3000` (opsiyonel, Railway zaten `PORT` verir)
- `NODE_ENV=production`
- `ALLOWED_ORIGINS=https://<frontend-service>.up.railway.app,http://localhost:5173`
- `AUTH_RATE_LIMIT_WINDOW_MS=900000` (opsiyonel)
- `AUTH_RATE_LIMIT_MAX_ATTEMPTS=5` (opsiyonel)

5. API health kontrol:

```txt
https://<api-service>.up.railway.app/health
```

### 16.2 Frontend servisi

1. Railway'de ikinci bir service olusturun, ayni repo'yu baglayin.
2. Bu servis icin root directory olarak `frontend` secin.
3. `frontend/railway.json` otomatik build/start komutlarini uygular.
4. Frontend env degiskeni:

- `VITE_API_BASE_URL=https://<api-service>.up.railway.app`

5. Deploy sonrasi UI URL:

```txt
https://<frontend-service>.up.railway.app
```

### 16.3 CORS ve Cookie Notu

- Frontend API cagrilarinda `credentials: include` kullanildigi icin API tarafinda `ALLOWED_ORIGINS` listesine frontend Railway URL'si mutlaka eklenmelidir.
- Auth cookie `sameSite=lax` ve production'da `secure=true` oldugu icin Railway HTTPS uzerinden calisma uygundur.

### 16.4 Migration Akisi

- API deploy baslangicinda migration otomatik uygulanir (`npx prisma migrate deploy`).
- Yeni migration eklediginizde sadece API servisini yeniden deploy etmeniz yeterlidir.

### 16.5 Domain Sonradan Baglama

- Test asamasinda custom domain gerekli degil.
- Ileride domain baglandiginda sadece su alanlari guncelleyin:
	- API `ALLOWED_ORIGINS`
	- Frontend `VITE_API_BASE_URL`

### 16.6 Simdi Ne Yapacagim? (Hizli Uygulama Akisi)

Bu bolum, Railway'e ilk kez yayin alirken birebir izlenecek minimum adim listesidir.

1. Railway'de Project ac.
2. PostgreSQL ekle.
3. API service olustur (repo root: proje koku).
4. API Variables gir:
	- DATABASE_URL
	- JWT_SECRET
	- NODE_ENV=production
	- ALLOWED_ORIGINS (simdilik bos birakma; frontend URL ciktiktan sonra guncelleyeceksin)
5. API deploy tamamlaninca URL'yi not et.
6. Frontend service olustur (repo root: frontend).
7. Frontend Variables gir:
	- VITE_API_BASE_URL = API URL
8. Frontend deploy tamamlaninca frontend URL'yi not et.
9. API ALLOWED_ORIGINS degerini frontend URL'yi icerecek sekilde guncelle.
10. API service'i Redeploy et.
11. Frontend'den login testini yap.

### 16.7 Railway Panelinde Birebir Alanlar

API service icin:
- Source Repo: ayni GitHub repo
- Root Directory: . (repo koku)
- Config File: railway.json (otomatik algilanir)
- Networking: public URL acik

Frontend service icin:
- Source Repo: ayni GitHub repo
- Root Directory: frontend
- Config File: frontend/railway.json (root frontend oldugu icin railway.json olarak algilanir)
- Networking: public URL acik

PostgreSQL icin:
- Railway PostgreSQL plugin/service ekleyin.
- DATABASE_URL degerini API service Variables alanina kopyalayin.

### 16.8 Degisken Ornekleri (Test Ortami)

Hazir dosya olarak da mevcuttur:
- `deploy/railway-api.env.example`
- `deploy/railway-frontend.env.example`

API:
- DATABASE_URL=postgresql://...
- JWT_SECRET=buraya_uzun_ve_karisik_bir_secret
- NODE_ENV=production
- ALLOWED_ORIGINS=https://frontend-servis-adin.up.railway.app,http://localhost:5173
- AUTH_RATE_LIMIT_WINDOW_MS=900000
- AUTH_RATE_LIMIT_MAX_ATTEMPTS=5

Frontend:
- VITE_API_BASE_URL=https://api-servis-adin.up.railway.app

Kopyala-yapistir kullanim:

1. `deploy/railway-api.env.example` dosyasini ac.
2. Degerleri kendi Railway URL/secret bilgilerine gore guncelle.
3. API service Variables alanina satirlari tek tek gir.
4. `deploy/railway-frontend.env.example` dosyasindaki `VITE_API_BASE_URL` degerini API URL ile doldur.
5. Frontend service Variables alanina ekle.

### 16.9 Ilk Yayindan Sonra Dogrulama Checklist

1. API saglik kontrolu:
	- https://api-servis-adin.up.railway.app/health
	- Beklenen cevap: {"ok":true}
2. Frontend aciliyor mu:
	- https://frontend-servis-adin.up.railway.app
3. Login basarili mi:
	- Admin veya resident ile giris yap.
4. Session/cookie calisiyor mu:
	- Sayfayi yenileyince oturum devam etmeli.
5. CORS hatasi var mi:
	- Tarayici console'da Origin is not allowed goruluyorsa ALLOWED_ORIGINS'i kontrol et.

### 16.10 En SIk Hatalar ve Cozum

- Hata: Frontend aciliyor ama API istekleri 403.
	- Neden: ALLOWED_ORIGINS icinde frontend URL yok.
	- Cozum: API Variables'ta ALLOWED_ORIGINS'e frontend URL ekle, redeploy et.

- Hata: API boot olurken DB hatasi.
	- Neden: DATABASE_URL yanlis veya DB service bagli degil.
	- Cozum: Railway PostgreSQL URL'yi tekrar kopyala; API logs kontrol et.

- Hata: Login oluyor ama sonraki istekte yetki dusuyor.
	- Neden: Cookie/CORS uyumsuzlugu.
	- Cozum: Frontend URL'nin ALLOWED_ORIGINS'te oldugunu ve HTTPS URL kullanildigini dogrula.

- Hata: Yeni migration sonrasi endpointler bozuldu.
	- Neden: Migration deploy edilmedi.
	- Cozum: API redeploy tetikle (start komutunda prisma migrate deploy calisir).

### 16.11 Kucuk Notlar (Testten Canliya Gecis)

- Testte domain zorunlu degil; Railway URL yeterli.
- Canliya gecince sadece 2 kritik degisken guncellenir:
	- API ALLOWED_ORIGINS
	- Frontend VITE_API_BASE_URL
- Yayin sonrasi smoke test:
	- Login
	- Ekstre
	- Odeme/Gider kaydi
	- Upload akislari

## 17. Gunluk Hizli Baslangic Checklist

```bash
npm install
npm run prisma:generate
npm run dev:local
npm run dev:frontend
```

Ardindan:
- `http://localhost:3000/health` kontrol et.
- `http://localhost:5173` ac.
- Admin login ile `RP` altindaki raporlari dogrula.

## 18. Guncel Gelismeler (Mart 2026)

Bu bolum son iterasyonlarda canli olarak uygulanan degisikliklerin operasyonel ozetidir.

### 18.1 Admin sayfalarinda parcali route extraction ve lazy loading

- `frontend/src/App.tsx` uzerindeki buyuk admin route bloklari parcali componentlere ayrildi.
- Asagidaki sayfalar lazy yuklenir:
	- `/admin/statement`
	- `/admin/reconcile/door-mismatch-report`
	- `/admin/guide/manual`
	- `/admin/apartments/history`
- Yukleme fallback gorunumu ile sayfa gecisleri daha stabil hale getirildi.

### 18.2 Upload batch detaylari (dosya bazli acilir-kapanir detay)

- `/admin/upload-batches` ekraninda her satir icin `Goster/Gizle` detayi eklendi.
- Detaylar backend'den lazy fetch ile cekilir ve cache'lenir.
- Yeni endpoint:
	- `GET /api/admin/upload-batches/:batchId/details`
- Gosterilen detaylar:
	- Olusan odemeler
	- Olusan giderler
	- Upload metadata

### 18.3 Upload detay tablosu davranislari

- Tarih siralamasi yeni kayit en ustte (Z -> A / desc).
- Odemelerde referans ayri kolonda gosterilir.
- `BANK_REF:` ve `REF:` etiketleri parse edilip referans kolonuna tasinir.
- Not alaninda tekrarli referans metni temizlenir.
- `BANK_DESC:` etiketi metinden kaldirilip yalniz aciklama tutulur.
- Bazi gorunumlerde tarih-saat yerine tarih bazli sade gosterim kullanilir.

### 18.4 Daire degisiklik gecmisi (historical audit screen)

- Prisma model/genisleme:
	- `ApartmentChangeAction` enum
	- `ApartmentChangeLog` model
- Yeni migration:
	- `prisma/migrations/20260322190000_add_apartment_change_logs/migration.sql`
- Backend kayit noktalari:
	- Daire olusturma
	- Daire guncelleme
	- Toplu daire sinif/tip guncelleme
- Yeni endpoint:
	- `GET /api/admin/apartments/:apartmentId/change-logs`
- Yeni ekran:
	- `/admin/apartments/history`
- UI'da su bilgiler listelenir:
	- Hangi alan degisti
	- Eski deger
	- Yeni deger
	- Degistiren kullanici
	- Degisiklik zamani

### 18.5 Kaydetme geri bildirimi: modal/popup standardi

- Baslangicta satir ici bildirim olan alanlar ortada acilan modal yapiya alindi.
- Ortak desen:
	- `blocking-modal`
	- `save-notice-modal-card`
	- Kisa sureli auto-dismiss (timer)
- Uygulanan sayfalar:
	- Daire Form (`/admin/apartments/new`, `/admin/apartments/edit`)
	- Daire Sinifi Yonetimi
	- Daire Tipi Yonetimi
	- Daire Gorevi Yonetimi
	- Daire Toplu Duzenleme
	- Duyuru/Anket Yonetimi
- App seviyesinde merkezi toast yapisi modal gorunume cekildi.
- `POST/PUT/DELETE` data degisimi sonrasi modal bildirim standardize edildi.

### 18.6 Tahakkuk menusu isimlendirme netlestirmesi

- Cakisan menu etiketleri ayrildi:
	- `/admin/charge-types` -> `Tahakkuk Tipleri`
	- `/admin/charges/new` -> `Tahakkuk Girisi`
- Form basligi da `Tahakkuk Girisi` olarak guncellendi.

### 18.7 Odeme Listesi tablo kompaktlastirma

- URL: `/admin/payments/list`
- Sutun adlari sadeleştirildi:
	- `Daire No` -> `D.No`
	- `Yontem` -> `Ynt.`
- Referans/Kaynak sutun cakismasi giderildi.
- Gereksiz sutun genislikleri daraltildi.
- Aksiyon kolonunda `Duzelt` ve `Sil` tek satirda sabitlendi.

### 18.8 Raporlar menusune Odeme Listesi kisayolu

- `RP` (Raporlar) altina `/admin/payments/list` linki eklendi.
- Boylece odeme listeleme rapor akisina daha yakindan konumlandi.

### 18.9 Rapor ana sayfa kart duzeni sadeleştirme

- URL: `/admin/reports`
- `Gider Raporu / Toplam gider tutari` kutusu kaldirildi (istenen sade gorunum).

### 18.10 Raporlar arasi tikla-gec akis iyilestirmeleri

- `En Yuksek 10 Gider Kalemi` tablosu:
	- Satir tiklaninca `/admin/expenses/report` acilir.
	- Tiklanan kalem otomatik filtrelenir (`expenseItemId`).
	- Rapor verisi otomatik yuklenir.
- Klavye erisilebilirligi:
	- `Enter` / `Space` ile tetiklenir.

### 18.11 Geciken daireler ozet listesi

- `/api/admin/reports/summary` cevabi genisletildi:
	- `topOverdueApartments` (ilk 5 daire, kalan toplam borca gore)
- `/admin/reports` ekranina yeni blok eklendi:
	- `Gecikenlerde Ilk 5 Daire`
	- Toplam geciken tutar
	- Daire bazli geciken borc adedi ve toplam geciken
- Liste satiri tiklaninca:
	- `/admin/statement` acilir
	- Ilgili daire secilir
	- Ekstre otomatik yuklenir

### 18.12 Derleme ve dogrulama notu

- Bu guncelleme paketlerinin her birinden sonra frontend production build alinmistir:
	- `npm --prefix frontend run build`
- Buildler basarili tamamlanmis, kritik tip/syntax hatasi raporlanmamistir.

## 19. Operasyonel Test Senaryolari (Onerilen)

Asagidaki smoke test senaryolari her release sonrasi hizli guvence saglar.

1. `/admin/reports` ac; `En Yuksek 10 Gider Kalemi` satirina tikla, `/admin/expenses/report` kalem filtresi ile acilmali.
2. `/admin/reports` ac; `Gecikenlerde Ilk 5 Daire` satirina tikla, `/admin/statement` secili daire ekstresi yuklenmeli.
3. `/admin/payments/list` ac; `D.No`, `Ynt.`, `Referans`, `Kaynak` kolonlari tek satir duzende olmali.
4. Daire duzenleme veya tanim ekranlarinda kaydet/sil islemi yap; ortada modal basari bildirimi cikmali.
5. `/admin/charge-types` ve `/admin/charges/new` menu etiketlerinin farkli oldugunu kontrol et (`Tahakkuk Tipleri` / `Tahakkuk Girisi`).
