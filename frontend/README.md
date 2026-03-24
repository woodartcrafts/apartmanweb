# ApartmanWeb Frontend

React + TypeScript + Vite tabanli yonetim paneli.

Bu uygulama iki ana rol icin arayuz sunar:
- `ADMIN`: daire, tahakkuk, odeme, gider, rapor, import ve sistem duzeltme islemleri
- `RESIDENT`: sadece kendi dairesi icin ekstre goruntuleme

## Gereksinimler

- Node.js 20+
- NPM 10+
- Calisan backend API (`http://localhost:3000` varsayilan)

## Kurulum

```bash
cd frontend
npm install
```

## Ortam Degiskenleri

`frontend/.env` dosyasina su degiskeni ekleyin:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Eklenmezse uygulama varsayilan olarak `http://localhost:3000` kullanir.

## Calistirma

Frontend klasorunde:

```bash
npm run dev
```

Root klasorden hizli local komut:

```bash
npm run dev:frontend
```

Bu komut 5173 portunu bosaltir ve Vite'i `--host --strictPort --port 5173` ile baslatir.

## Build ve Kontroller

```bash
npm run build
npm run lint
npm run preview
```

## Rota Ozetleri

- `/`: ana sayfa
- `/login`: giris
- `/admin`: admin panel
- `/resident`: resident panel

## Kod Organizasyonu

Mevcut refactor ile ortak tip/sabit/fonksiyonlar su dosyaya alinmistir:
- `src/app/shared.ts`

Bu dosya su basliklari merkezilestirir:
- API tabani ve local storage anahtarlari
- paylasilan uygulama tipleri
- tarih/para formatlama yardimcilari
- import bilgi/hata mesaji aciklamalari

Ana uygulama girisi:
- `src/main.tsx`
- `src/App.tsx`
