type GuideRow = {
  module: string;
  page: string;
  purpose: string;
  whenToUse: string;
};

const guideRows: GuideRow[] = [
  { module: "Daire", page: "Daire Ekle", purpose: "Yeni daire kaydi olusturur.", whenToUse: "Yeni daire devreye alinirken." },
  { module: "Daire", page: "Daire Listesi", purpose: "Filtreli daire listeleme ve hizli duzeltme.", whenToUse: "Toplu kontrol ve arama gerektiginde." },
  { module: "Daire", page: "Daire Degistir", purpose: "Tekli veya coklu daire guncelleme.", whenToUse: "Ozellik, gorev, iletisim bilgisi degisimlerinde." },
  { module: "Daire", page: "Daire Excel Yukle", purpose: "Excel ile toplu daire aktarimi.", whenToUse: "Ilk kurulum veya buyuk veri guncellemesinde." },
  { module: "Daire", page: "Daire Toplu Duzenle", purpose: "Sinif/tip alanlarini filtreli toplu degistirme.", whenToUse: "Cok sayida dairede ayni nitelik degisiminde." },
  { module: "Daire", page: "Blok Ekle", purpose: "Blok tanimlarini yonetir.", whenToUse: "Yeni blok acildiginda." },
  { module: "Daire", page: "Daire Siniflari / Tipleri / Gorevleri", purpose: "Tanim tablolarini yonetir.", whenToUse: "Yeni sinif-tip-gorev ihtiyacinda." },

  { module: "Tahakkuk", page: "Tahakkuk Tipleri", purpose: "Tahakkuk kod/isim ve odeme hedefini yonetir.", whenToUse: "Yeni borc turu tanimlanirken." },
  { module: "Tahakkuk", page: "Tahakkuk Giris", purpose: "Secili daireye tekli tahakkuk yazar.", whenToUse: "Manuel borclandirma gerekirken." },
  { module: "Tahakkuk", page: "Toplu Tahakkuk", purpose: "Donemsel toplu tahakkuk olusturur.", whenToUse: "Aylik rutin tahakkukta." },
  { module: "Tahakkuk", page: "Toplu Tahakkuk Silme ve Duzeltme", purpose: "Toplu kayit duzeltme/silme yapar.", whenToUse: "Yanlis toplu islem geri alinacaksa." },
  { module: "Tahakkuk", page: "Gider Dagitimi", purpose: "Fatura tutarini katsayiya gore dairelere dagitir.", whenToUse: "Dogalgaz vb. dagitim gereken giderlerde." },
  { module: "Tahakkuk", page: "Borc Kapat", purpose: "Borc kayitlarini durum bazli kapatir.", whenToUse: "Kapanis islemlerinde." },

  { module: "Odeme", page: "Odeme Tipleri", purpose: "Odeme yontemi tanimlarini yonetir.", whenToUse: "Yeni odeme kanali eklendiginde." },
  { module: "Odeme", page: "Odeme Gir", purpose: "Tekli odeme girisi yapar.", whenToUse: "Manuel tahsilat kaydinda." },
  { module: "Odeme", page: "Odeme Raporu", purpose: "Odeme listeleme, filtreleme ve duzeltme.", whenToUse: "Tahsilat takibinde." },

  { module: "Ekstre", page: "Ekstre", purpose: "Secili daire borc-alacak hareketlerini gosterir.", whenToUse: "Daire bazli durum incelemesinde." },
  { module: "Ekstre", page: "Toplu Ekstre", purpose: "Tum dairelerin toplu borc durumunu verir.", whenToUse: "Genel borc analizinde." },
  { module: "Ekstre", page: "Eslestirme", purpose: "Odeme-tahakkuk baglarini yeniden hesaplar.", whenToUse: "Yanlis dagilim veya duzeltme sonrasi." },

  { module: "Gider", page: "Gider Kalemleri", purpose: "Gider kod/tanim yonetimi.", whenToUse: "Yeni gider kalemi acarken." },
  { module: "Gider", page: "Gider Giris", purpose: "Tekli gider kaydi olusturur.", whenToUse: "Gunluk manuel gider islemlerinde." },
  { module: "Gider", page: "Gider Raporu", purpose: "Gider filtreleme, ozet, duzeltme/silme.", whenToUse: "Donemsel harcama kontrolunde." },

  { module: "Raporlar", page: "Rapor Ana Sayfa", purpose: "Kritik ozet kartlari ve hizli yonlendirme.", whenToUse: "Panel acilisinda genel durum icin." },
  { module: "Raporlar", page: "Daire Listesi Raporu", purpose: "Rapor baglaminda daire genel listesi.", whenToUse: "Daire envanteri kontrolunde." },
  { module: "Raporlar", page: "Gecikmis Odemeler", purpose: "Vadesi gecmis borclari listeler.", whenToUse: "Tahsilat takibinde." },
  { module: "Raporlar", page: "Tahakkuk Kontrol", purpose: "Tutar, vade, eksik/mukerrer kontrolu yapar.", whenToUse: "Aylik tahakkuk dogrulamasinda." },
  { module: "Raporlar", page: "Aylik Bakiye Matrisi", purpose: "Daire bazli aylik kalan borc matrisini verir.", whenToUse: "Donemsel borc dagilimi analizinde." },
  { module: "Raporlar", page: "Referans Ile Hareket Ara", purpose: "Referans no ile odeme-gider hareketlerini bulur.", whenToUse: "Banka hareketi iz surmede." },
  { module: "Raporlar", page: "Banka Ekstresi Karsilastirma", purpose: "Sistem hareketi ile ekstre satirlarini karsilastirir.", whenToUse: "Mutabakat kontrolunde." },

  { module: "Bankalar", page: "Banka ve Sube Tanimlari", purpose: "Banka/sube tanimlarini yonetir.", whenToUse: "Yeni hesap acilisinda." },
  { module: "Bankalar", page: "Banka Acilis Bakiyesi", purpose: "Baslangic banka bakiyesi uygular.", whenToUse: "Sistem devir acilisinda." },
  { module: "Bankalar", page: "Banka Ekstresi Yukle", purpose: "Ekstre dosyasindan odeme/gider olusturur.", whenToUse: "Banka hareketlerini iceri alirken." },
  { module: "Bankalar", page: "Yukleme Kayitlari", purpose: "Import gecmisini ve sonucunu gosterir.", whenToUse: "Yukleme audit kontrolunde." },

  { module: "Sistem", page: "Aciklama-Daire Esleme", purpose: "Aciklamadan daire no otomatik bulma kurali.", whenToUse: "Surekli ayni metin kaliplari oldugunda." },
  { module: "Sistem", page: "Aciklama-Gider Esleme", purpose: "Aciklamadan gider kalemi otomatik secimi.", whenToUse: "Banka aciklamalarinda tekrar eden kaliplarda." },
  { module: "Sistem", page: "Banka Eslestirme Kontrolu", purpose: "DOOR etiketi ile baglanan daire uyumsuzlugunu raporlar.", whenToUse: "Yanlis daire eslesmesi suphelerinde." },
  { module: "Sistem", page: "Duzeltmeler", purpose: "Secili dairenin tahakkuk/odeme satirlarini duzeltir.", whenToUse: "Kayit bazli manuel revizyonda." },
  { module: "Sistem", page: "Islem Gecmisi", purpose: "Audit kayitlarini ve geri alma islemlerini gosterir.", whenToUse: "Kim, neyi, ne zaman degistirdi incelemesinde." },
];

const moduleShortCodeMap: Record<string, string> = {
  Daire: "DR",
  Tahakkuk: "TH",
  Odeme: "OD",
  Ekstre: "EK",
  Gider: "GD",
  Raporlar: "RP",
  Bankalar: "BK",
  Sistem: "SY",
};

function getModuleClassName(moduleName: string): string {
  switch (moduleName) {
    case "Daire":
      return "guide-module-chip module-tone-home";
    case "Tahakkuk":
      return "guide-module-chip module-tone-charge";
    case "Odeme":
      return "guide-module-chip module-tone-payment";
    case "Ekstre":
      return "guide-module-chip module-tone-ledger";
    case "Gider":
      return "guide-module-chip module-tone-expense";
    case "Raporlar":
      return "guide-module-chip module-tone-report";
    case "Bankalar":
      return "guide-module-chip module-tone-bank";
    case "Sistem":
      return "guide-module-chip module-tone-system";
    default:
      return "guide-module-chip";
  }
}

export function GuideManualPage() {
  const moduleCount = new Set(guideRows.map((row) => row.module)).size;
  const pageCount = guideRows.length;

  return (
    <section className="dashboard report-page guide-manual-page">
      <div className="card table-card report-page-card guide-manual-hero-card">
        <div className="guide-manual-hero-grid">
          <div>
            <h3 className="guide-manual-title">
              <span className="guide-manual-title-badge" aria-hidden="true">KL</span>
              Kullanim Kilavuzu
            </h3>
            <p className="small guide-manual-subtitle">
              Bu ekran, paneldeki ana sayfalarin amacini, hangi durumda kullanilacagini ve genel teknik akis mantigini tek yerden anlatir.
            </p>
            <div className="guide-manual-highlight-grid compact-row-top-gap">
              <article className="guide-highlight-card">
                <span className="guide-highlight-icon" aria-hidden="true">AK</span>
                <div>
                  <h4>Akis Odakli</h4>
                  <p className="small">Gunluk operasyon, aylik kapanis ve duzeltme senaryolari ayni akista.</p>
                </div>
              </article>
              <article className="guide-highlight-card">
                <span className="guide-highlight-icon" aria-hidden="true">AP</span>
                <div>
                  <h4>Amaca Gore Sayfalar</h4>
                  <p className="small">Her satir, ilgili ekranin ne ise yaradigini ve ne zaman acilacagini soyler.</p>
                </div>
              </article>
            </div>
          </div>

          <div className="guide-manual-visual" aria-hidden="true">
            <svg viewBox="0 0 300 180" role="img" aria-label="Kilavuz akis gorseli">
              <defs>
                <linearGradient id="guideManualSky" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#d6ecff" />
                  <stop offset="100%" stopColor="#f8fcff" />
                </linearGradient>
                <linearGradient id="guideManualTower" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#95b9df" />
                  <stop offset="100%" stopColor="#5f89b4" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="300" height="180" rx="16" fill="url(#guideManualSky)" />
              <rect x="34" y="48" width="70" height="106" rx="8" fill="url(#guideManualTower)" />
              <rect x="118" y="26" width="86" height="128" rx="8" fill="#7aa6d4" />
              <rect x="214" y="58" width="54" height="96" rx="8" fill="#93b4d8" />
              <rect x="56" y="72" width="16" height="14" rx="3" fill="#fdf4c1" />
              <rect x="78" y="72" width="16" height="14" rx="3" fill="#fdf4c1" />
              <rect x="56" y="92" width="16" height="14" rx="3" fill="#fdf4c1" />
              <rect x="78" y="92" width="16" height="14" rx="3" fill="#fdf4c1" />
              <rect x="136" y="50" width="14" height="12" rx="2" fill="#fdf4c1" />
              <rect x="156" y="50" width="14" height="12" rx="2" fill="#fdf4c1" />
              <rect x="176" y="50" width="14" height="12" rx="2" fill="#fdf4c1" />
              <rect x="136" y="68" width="14" height="12" rx="2" fill="#fdf4c1" />
              <rect x="156" y="68" width="14" height="12" rx="2" fill="#fdf4c1" />
              <rect x="176" y="68" width="14" height="12" rx="2" fill="#fdf4c1" />
              <path d="M42 160H268" stroke="#6a90b8" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <span className="guide-manual-visual-chip">PLAN</span>
            <span className="guide-manual-visual-chip chip-secondary">ISLEYIS</span>
          </div>
        </div>

        <div className="stats-grid guide-manual-kpi-grid compact-row-top-gap">
          <article className="card stat stat-tone-info">
            <h4>Toplam Modul</h4>
            <p>{moduleCount}</p>
            <span className="small">Admin paneldeki ana bolumler</span>
          </article>
          <article className="card stat stat-tone-good">
            <h4>Toplam Sayfa</h4>
            <p>{pageCount}</p>
            <span className="small">Kilavuzda aciklanan ekran adedi</span>
          </article>
          <article className="card stat stat-tone-warn">
            <h4>Gunun Baslangici</h4>
            <p>3</p>
            <span className="small">Rapor Ana Sayfa, Gecikmis Odemeler, Gider Raporu</span>
          </article>
          <article className="card stat stat-tone-danger">
            <h4>Aylik Kapanis</h4>
            <p>3</p>
            <span className="small">Tahakkuk Kontrol, Bakiye Matrisi, Ekstre Karsilastirma</span>
          </article>
        </div>
      </div>

      <div className="card table-card report-page-card guide-manual-core-card">
        <h3 className="guide-manual-section-title">
          <span className="guide-manual-section-icon" aria-hidden="true">TK</span>
          Genel Yapi ve Teknik Isleyis
        </h3>
        <div className="guide-grid compact-row-top-gap guide-manual-core-grid">
          <article className="card stat stat-tone-info">
            <h4>Kimlik ve Erisim</h4>
            <p className="small">Tum admin sayfalari yetkili oturumla calisir. API istekleri cookie tabanli yetkilendirme ile gider.</p>
          </article>
          <article className="card stat stat-tone-info">
            <h4>Merkezi Veri Akisi</h4>
            <p className="small">Sayfalar veriyi backend endpointlerinden ceker. Kaydet, sil, duzelt islemleri sonrasi ilgili raporlar yeniden yuklenir.</p>
          </article>
          <article className="card stat stat-tone-info">
            <h4>Rapor Mantigi</h4>
            <p className="small">Raporlar filtre parametreleriyle calisir. Bir cok raporda kolon secimi, toplu ozet kartlari ve detay tablolari vardir.</p>
          </article>
          <article className="card stat stat-tone-warn">
            <h4>Dogrulama Kurallari</h4>
            <p className="small">Daire muafiyetleri, tahakkuk kural kontrolleri, eslestirme kontrolleri gibi is kurallari backend tarafinda zorunlu uygulanir.</p>
          </article>
        </div>
      </div>

      <div className="card table-card report-page-card guide-manual-table-card">
        <h3 className="guide-manual-section-title">
          <span className="guide-manual-section-icon" aria-hidden="true">SY</span>
          Sayfalar ve Amaclari
        </h3>
        <div className="table-wrap compact-row-top-gap">
          <table className="apartment-list-table report-compact-table guide-manual-table">
            <thead>
              <tr>
                <th>Modul</th>
                <th>Sayfa</th>
                <th>Amac</th>
                <th>Ne Zaman Kullanilir</th>
              </tr>
            </thead>
            <tbody>
              {guideRows.map((row) => (
                <tr key={`${row.module}-${row.page}`}>
                  <td>
                    <span className={getModuleClassName(row.module)}>
                      <span className="module-code">{moduleShortCodeMap[row.module] ?? "MD"}</span>
                      {row.module}
                    </span>
                  </td>
                  <td>{row.page}</td>
                  <td>{row.purpose}</td>
                  <td>{row.whenToUse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card table-card report-page-card guide-manual-usage-card">
        <h3 className="guide-manual-section-title">
          <span className="guide-manual-section-icon" aria-hidden="true">HO</span>
          Hizli Kullanim Onerisi
        </h3>
        <div className="guide-list guide-manual-usage-list compact-row-top-gap">
          <article className="card">
            <h4>Gunun Basinda</h4>
            <p className="small">Rapor Ana Sayfa, Gecikmis Odemeler, Gider Raporu.</p>
          </article>
          <article className="card">
            <h4>Aylik Kapanista</h4>
            <p className="small">Tahakkuk Kontrol, Aylik Bakiye Matrisi, Banka Ekstresi Karsilastirma.</p>
          </article>
          <article className="card">
            <h4>Veri Duzeltmede</h4>
            <p className="small">Duzeltmeler, Eslestirme, Islem Gecmisi (gerekirse geri al).</p>
          </article>
        </div>
      </div>
    </section>
  );
}
