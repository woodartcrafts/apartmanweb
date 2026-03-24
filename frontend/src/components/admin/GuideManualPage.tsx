export function GuideManualPage() {
  return (
    <section className="dashboard report-page">
      <div className="card table-card report-page-card">
        <div className="section-head report-toolbar">
          <h3>Kullanim Kilavuzu</h3>
        </div>
        <p className="small">
          Bu ekran, paneldeki tum ana sayfalarin amacini, hangi durumda kullanilacagini ve genel teknik akis mantigini aciklar.
        </p>
      </div>

      <div className="card table-card report-page-card">
        <h3>Genel Yapi ve Teknik Isleyis</h3>
        <div className="guide-grid compact-row-top-gap">
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

      <div className="card table-card report-page-card">
        <h3>Sayfalar ve Amaclari</h3>
        <div className="table-wrap compact-row-top-gap">
          <table className="apartment-list-table report-compact-table">
            <thead>
              <tr>
                <th>Modul</th>
                <th>Sayfa</th>
                <th>Amac</th>
                <th>Ne Zaman Kullanilir</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Daire</td><td>Daire Ekle</td><td>Yeni daire kaydi olusturur.</td><td>Yeni daire devreye alinirken.</td></tr>
              <tr><td>Daire</td><td>Daire Listesi</td><td>Filtreli daire listeleme ve hizli duzeltme.</td><td>Toplu kontrol ve arama gerektiğinde.</td></tr>
              <tr><td>Daire</td><td>Daire Degistir</td><td>Tekli veya coklu daire guncelleme.</td><td>Ozellik, gorev, iletisim bilgisi degisimlerinde.</td></tr>
              <tr><td>Daire</td><td>Daire Excel Yukle</td><td>Excel ile toplu daire aktarimi.</td><td>Ilk kurulum veya buyuk veri guncellemesinde.</td></tr>
              <tr><td>Daire</td><td>Daire Toplu Duzenle</td><td>Sinif/tip alanlarini filtreli toplu degistirme.</td><td>Cok sayida dairede ayni nitelik degisiminde.</td></tr>
              <tr><td>Daire</td><td>Blok Ekle</td><td>Blok tanimlarini yonetir.</td><td>Yeni blok acildiginda.</td></tr>
              <tr><td>Daire</td><td>Daire Siniflari / Tipleri / Gorevleri</td><td>Tanim tablolarini yonetir.</td><td>Yeni sinif-tip-gorev ihtiyacinda.</td></tr>

              <tr><td>Tahakkuk</td><td>Tahakkuk Tipleri</td><td>Tahakkuk kod/isim ve odeme hedefini yonetir.</td><td>Yeni borc turu tanimlanirken.</td></tr>
              <tr><td>Tahakkuk</td><td>Tahakkuk Giris</td><td>Secili daireye tekli tahakkuk yazar.</td><td>Manuel borclandirma gerekirken.</td></tr>
              <tr><td>Tahakkuk</td><td>Toplu Tahakkuk</td><td>Donemsel toplu tahakkuk olusturur.</td><td>Aylik rutin tahakkukta.</td></tr>
              <tr><td>Tahakkuk</td><td>Toplu Tahakkuk Silme ve Duzeltme</td><td>Toplu kayit duzeltme/silme yapar.</td><td>Yanlis toplu islem geri alinacaksa.</td></tr>
              <tr><td>Tahakkuk</td><td>Gider Dagitimi</td><td>Fatura tutarini katsayiya gore dairelere dagitir.</td><td>Dogalgaz vb. dagitim gereken giderlerde.</td></tr>
              <tr><td>Tahakkuk</td><td>Borc Kapat</td><td>Borc kayitlarini durum bazli kapatir.</td><td>Kapanis islemlerinde.</td></tr>

              <tr><td>Odeme</td><td>Odeme Tipleri</td><td>Odeme yontemi tanimlarini yonetir.</td><td>Yeni odeme kanali eklendiginde.</td></tr>
              <tr><td>Odeme</td><td>Odeme Gir</td><td>Tekli odeme girisi yapar.</td><td>Manuel tahsilat kaydinda.</td></tr>
              <tr><td>Odeme</td><td>Odeme Raporu</td><td>Odeme listeleme, filtreleme ve duzeltme.</td><td>Tahsilat takibinde.</td></tr>

              <tr><td>Ekstre</td><td>Ekstre</td><td>Secili daire borc-alacak hareketlerini gosterir.</td><td>Daire bazli durum incelemesinde.</td></tr>
              <tr><td>Ekstre</td><td>Toplu Ekstre</td><td>Tum dairelerin toplu borc durumunu verir.</td><td>Genel borc analizinde.</td></tr>
              <tr><td>Ekstre</td><td>Eslestirme</td><td>Odeme-tahakkuk baglarini yeniden hesaplar.</td><td>Yanlis dagilim veya duzeltme sonrasi.</td></tr>

              <tr><td>Gider</td><td>Gider Kalemleri</td><td>Gider kod/tanim yonetimi.</td><td>Yeni gider kalemi acarken.</td></tr>
              <tr><td>Gider</td><td>Gider Giris</td><td>Tekli gider kaydi olusturur.</td><td>Gunluk manuel gider islemlerinde.</td></tr>
              <tr><td>Gider</td><td>Gider Raporu</td><td>Gider filtreleme, ozet, duzeltme/silme.</td><td>Donemsel harcama kontrolunde.</td></tr>

              <tr><td>Raporlar</td><td>Rapor Ana Sayfa</td><td>Kritik ozet kartlari ve hizli yonlendirme.</td><td>Panel acilisinda genel durum icin.</td></tr>
              <tr><td>Raporlar</td><td>Daire Listesi Raporu</td><td>Rapor baglaminda daire genel listesi.</td><td>Daire envanteri kontrolunde.</td></tr>
              <tr><td>Raporlar</td><td>Gecikmis Odemeler</td><td>Vadesi gecmis borclari listeler.</td><td>Tahsilat takibinde.</td></tr>
              <tr><td>Raporlar</td><td>Tahakkuk Kontrol</td><td>Tutar, vade, eksik/mukerrer kontrolu yapar.</td><td>Aylik tahakkuk dogrulamasinda.</td></tr>
              <tr><td>Raporlar</td><td>Aylik Bakiye Matrisi</td><td>Daire bazli aylik kalan borc matrisini verir.</td><td>Donemsel borc dagilimi analizinde.</td></tr>
              <tr><td>Raporlar</td><td>Referans Ile Hareket Ara</td><td>Referans no ile odeme-gider hareketlerini bulur.</td><td>Banka hareketi iz surmede.</td></tr>
              <tr><td>Raporlar</td><td>Banka Ekstresi Karsilastirma</td><td>Sistem hareketi ile ekstre satirlarini karsilastirir.</td><td>Mutabakat kontrolunde.</td></tr>

              <tr><td>Bankalar</td><td>Banka ve Sube Tanimlari</td><td>Banka/sube tanimlarini yonetir.</td><td>Yeni hesap acilisinda.</td></tr>
              <tr><td>Bankalar</td><td>Banka Acilis Bakiyesi</td><td>Baslangic banka bakiyesi uygular.</td><td>Sistem devir acilisinda.</td></tr>
              <tr><td>Bankalar</td><td>Banka Ekstresi Yukle</td><td>Ekstre dosyasindan odeme/gider olusturur.</td><td>Banka hareketlerini iceri alirken.</td></tr>
              <tr><td>Bankalar</td><td>Yukleme Kayitlari</td><td>Import gecmisini ve sonucunu gosterir.</td><td>Yukleme audit kontrolunde.</td></tr>

              <tr><td>Sistem</td><td>Aciklama-Daire Esleme</td><td>Aciklamadan daire no otomatik bulma kurali.</td><td>Surekli ayni metin kaliplari oldugunda.</td></tr>
              <tr><td>Sistem</td><td>Aciklama-Gider Esleme</td><td>Aciklamadan gider kalemi otomatik secimi.</td><td>Banka aciklamalarinda tekrar eden kaliplarda.</td></tr>
              <tr><td>Sistem</td><td>Banka Eslestirme Kontrolu</td><td>DOOR etiketi ile baglanan daire uyumsuzlugunu raporlar.</td><td>Yanlis daire eslesmesi suphelerinde.</td></tr>
              <tr><td>Sistem</td><td>Duzeltmeler</td><td>Secili dairenin tahakkuk/odeme satirlarini duzeltir.</td><td>Kayit bazli manuel revizyonda.</td></tr>
              <tr><td>Sistem</td><td>Islem Gecmisi</td><td>Audit kayitlarini ve geri alma islemlerini gosterir.</td><td>Kim, neyi, ne zaman degistirdi incelemesinde.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card table-card report-page-card">
        <h3>Hizli Kullanim Onerisi</h3>
        <p className="small">Gunun basinda: Rapor Ana Sayfa, Gecikmis Odemeler, Gider Raporu.</p>
        <p className="small">Aylik kapanista: Tahakkuk Kontrol, Aylik Bakiye Matrisi, Banka Ekstresi Karsilastirma.</p>
        <p className="small">Veri duzeltmede: Duzeltmeler, Eslestirme, Islem Gecmisi (gerekirse geri al).</p>
      </div>
    </section>
  );
}
