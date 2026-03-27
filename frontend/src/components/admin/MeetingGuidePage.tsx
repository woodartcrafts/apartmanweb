import { apiBase } from "../../app/shared";

export function MeetingGuidePage() {
  const processSteps = [
    {
      step: "01",
      title: "Toplanti oncesi hazirlik ve cagri",
      timing: "Toplanti tarihinden en az 15 gun once",
      checks: [
        "Gundemli davet metninde yer, saat, gundem ve ikinci toplanti bilgisi net olsun.",
        "Teblig imza karsiligi veya iadeli taahhutlu mektup ile yapilsin.",
        "Ilk ve ikinci toplanti arasinda en az 7, en fazla 15 gun aralik birakilsin.",
      ],
    },
    {
      step: "02",
      title: "Yeter sayi kontrolu ve acilis",
      timing: "Toplanti baslangic aninda",
      checks: [
        "Ilk toplantida kisi ve arsa payi bakimindan salt cogunluk aranir.",
        "Ilk toplantida yeter sayi yoksa ikinci toplantida gelenlerle acilis yapilir.",
        "Ozel nitelikli oylama konulari icin kanundaki oranlar ayrica kontrol edilir.",
      ],
    },
    {
      step: "03",
      title: "Divan secimi ve gundem yonetimi",
      timing: "Acilistan hemen sonra",
      checks: [
        "Bir divan baskani ve bir yazman secilerek tutanak sorumlulugu netlestirilir.",
        "Toplanti yonetimi divan heyetine devredilir.",
        "Gundem disi madde ekleme talepleri 1/3 kisi sayisi kuraliyla degerlendirilir.",
      ],
    },
    {
      step: "04",
      title: "Karar alma, imza ve teblig",
      timing: "Toplanti sonunda ve sonraki bildirim surecinde",
      checks: [
        "Kararlar noter onayli karar defterine usulune uygun yazilir.",
        "Muhalefet serhleri acikca kayda gecirilir.",
        "Toplanti sonucu ve yeni donem isletme projesi katilmayanlara teblig edilir.",
      ],
    },
  ];

  const postMeetingChecklist = [
    "Imza listesi ve vekaletnameleri fiziksel dosyada ve dijital arsivde saklayin.",
    "Karar metinlerini karar no sirasina gore deftere eksiksiz gecirin.",
    "Aidat/proje degisikliklerini sistem tanimlarina ayni gun isleyin.",
    "Katilmayan malik ve kiracilar icin teblig takip listesi olusturun.",
    "Yeni yonetici/denetci secimi varsa banka ve resmi kurum bildirimlerini planlayin.",
  ];

  const standardAgendaDocuments = [
    {
      order: 1,
      title: "Mevcut yonetimin faaliyet raporunun okunmasi",
      fileName: "01-faaliyet-raporu-taslagi.doc",
      body: [
        "APARTMAN / SITE YONETIMI",
        "FAALIYET RAPORU TASLAGI",
        "",
        "Donem:",
        "Raporu Sunan Yonetici:",
        "",
        "1) Donem Icinde Yapilan Baslica Isler:",
        "-",
        "",
        "2) Mali Ozet:",
        "- Toplanan aidat/avans:",
        "- Yapilan giderler:",
        "- Donem sonu banka bakiyesi:",
        "",
        "3) Sonuc ve Degerlendirme:",
        "-",
      ].join("\n"),
    },
    {
      order: 2,
      title: "Denetci raporunun okunmasi",
      fileName: "02-denetci-raporu-taslagi.doc",
      body: [
        "APARTMAN / SITE YONETIMI",
        "DENETCI RAPORU TASLAGI",
        "",
        "Donem:",
        "Denetci:",
        "",
        "1) Defter ve Belgelerin Incelenmesi:",
        "-",
        "",
        "2) Banka ve Kasa Hareketlerinin Kontrolu:",
        "-",
        "",
        "3) Tespitler:",
        "-",
        "",
        "4) Gorus:",
        "-",
      ].join("\n"),
    },
    {
      order: 3,
      title: "Eski yonetimin ve denetcinin ibrasi",
      fileName: "03-ibra-karari-taslagi.doc",
      body: [
        "KAT MALIKLERI KURULU",
        "IBRA KARAR METNI TASLAGI",
        "",
        "Toplanti Tarihi:",
        "Karar No:",
        "",
        "Gundem maddesi kapsaminda eski yonetim ve denetci raporlari gorusulmus olup,",
        "katilimcilarin oylamasi sonucunda yonetim/denetim kurulu ibra edilmistir.",
        "",
        "Oylama Sonucu:",
        "- Kabul:",
        "- Red:",
        "- Cekimser:",
      ].join("\n"),
    },
    {
      order: 4,
      title: "Yeni yonetici/yonetim kurulu ve denetci secimi",
      fileName: "04-yonetici-denetci-secimi-taslagi.doc",
      body: [
        "KAT MALIKLERI KURULU",
        "YONETICI / DENETCI SECIM KARARI TASLAGI",
        "",
        "Toplanti Tarihi:",
        "Karar No:",
        "",
        "Secim Sonuclari:",
        "- Yonetici / Yonetim Kurulu:",
        "- Denetci:",
        "",
        "Gorev Suresi:",
        "Yetki Siniri ve Sorumluluklar:",
      ].join("\n"),
    },
    {
      order: 5,
      title: "Yeni donem isletme projesinin ve aidatlarin gorusulmesi/onayi",
      fileName: "05-isletme-projesi-aidat-karari-taslagi.doc",
      body: [
        "KAT MALIKLERI KURULU",
        "ISLETME PROJESI VE AIDAT KARARI TASLAGI",
        "",
        "Donem:",
        "Karar No:",
        "",
        "A) Tahmini Gider Toplami:",
        "B) Dagitim Yontemi:",
        "C) Aylik Aidat Tutari:",
        "D) Son Odeme Tarihi:",
        "E) Gecikme Tazminati Notu:",
      ].join("\n"),
    },
    {
      order: 6,
      title: "Dilek ve temenniler",
      fileName: "06-dilek-ve-temenniler-taslagi.doc",
      body: [
        "KAT MALIKLERI KURULU",
        "DILEK VE TEMENNILER TUTANAGI TASLAGI",
        "",
        "Toplanti Tarihi:",
        "",
        "Gorusulen Dilek ve Temenniler:",
        "1)",
        "2)",
        "3)",
        "",
        "Alinan Aksiyonlar / Notlar:",
        "-",
      ].join("\n"),
    },
  ];

  const evrakPackDocuments = [
    {
      label: "Toplanti Cagri Metni (Gundemli Davet)",
      purpose: "Toplantiya resmi cagiriyi yapmak (veritabanindan otomatik doldurulur)",
      status: "Hazir",
      fileName: "1_Cagri_Metni.docx",
      mode: "AUTO_FILL" as const,
    },
    {
      label: "Hazirun Cetveli",
      purpose: "Katilimci/vekil imza takibi (veritabanindan otomatik doldurulur)",
      status: "Hazir",
      fileName: "2_Hazirun_Cetveli.docx",
      mode: "AUTO_FILL_ATTENDANCE" as const,
    },
    {
      label: "Vekaletname Ornegi",
      purpose: "Vekil ile katilimlarda standart belge",
      status: "Hazir",
      fileName: "3_Vekaletname.docx",
      mode: "STATIC" as const,
    },
    {
      label: "Toplanti Tutanagi Taslagi",
      purpose: "Gorusmelerin resmi kaydi (veritabanindan otomatik doldurulur)",
      status: "Hazir",
      fileName: "4_Toplanti_Tutanagi.docx",
      mode: "AUTO_FILL_MINUTES" as const,
    },
    {
      label: "Karar Defteri Isleme Taslagi",
      purpose: "Kararlari deftere dogru formatta aktarmak (veritabanindan otomatik doldurulur)",
      status: "Hazir",
      fileName: "5_Karar_Defteri_Taslagi.docx",
      mode: "AUTO_FILL_DECISION_BOOK" as const,
    },
    {
      label: "Isletme Projesi (Butce/Aidat) Taslagi",
      purpose: "Yeni donem mali plan ve aidatlar (veritabanindan otomatik doldurulur)",
      status: "Hazir",
      fileName: "6_Isletme_Projesi.docx",
      mode: "AUTO_FILL_OPERATING_PLAN" as const,
    },
    {
      label: "Toplanti Sonrasi Teblig Listesi",
      purpose: "Katilmayan malik/kiraci bildirim takibi (veritabanindan otomatik doldurulur)",
      status: "Hazir",
      fileName: "7_Teblig_Takip_Listesi.docx",
      mode: "AUTO_FILL_NOTIFICATION_LIST" as const,
    },
  ];

  async function downloadAutoFilledInvitation(): Promise<void> {
    try {
      const response = await fetch(`${apiBase}/api/admin/meeting-documents/invitation`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(errorPayload.message ?? "Dolu cagri metni indirilemedi");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const contentDisposition = response.headers.get("content-disposition") ?? "";
      const fileNameMatch = /filename="?([^"]+)"?/i.exec(contentDisposition);
      const resolvedFileName = fileNameMatch?.[1] ?? "toplanti-cagri-metni-dolu.docx";
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = resolvedFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : "Dolu cagri metni indirilemedi");
    }
  }

  async function downloadAutoFilledAttendanceSheet(): Promise<void> {
    try {
      const response = await fetch(`${apiBase}/api/admin/meeting-documents/attendance-sheet`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(errorPayload.message ?? "Dolu hazirun cetveli indirilemedi");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const contentDisposition = response.headers.get("content-disposition") ?? "";
      const fileNameMatch = /filename="?([^"]+)"?/i.exec(contentDisposition);
      const resolvedFileName = fileNameMatch?.[1] ?? "hazirun-cetveli-dolu.docx";
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = resolvedFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : "Dolu hazirun cetveli indirilemedi");
    }
  }

  async function downloadAutoFilledMinutes(): Promise<void> {
    try {
      const response = await fetch(`${apiBase}/api/admin/meeting-documents/minutes`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(errorPayload.message ?? "Dolu toplanti tutanagi indirilemedi");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const contentDisposition = response.headers.get("content-disposition") ?? "";
      const fileNameMatch = /filename="?([^"]+)"?/i.exec(contentDisposition);
      const resolvedFileName = fileNameMatch?.[1] ?? "toplanti-tutanagi-dolu.docx";
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = resolvedFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : "Dolu toplanti tutanagi indirilemedi");
    }
  }

  async function downloadAutoFilledDecisionBook(): Promise<void> {
    try {
      const response = await fetch(`${apiBase}/api/admin/meeting-documents/decision-book`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(errorPayload.message ?? "Dolu karar defteri taslagi indirilemedi");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const contentDisposition = response.headers.get("content-disposition") ?? "";
      const fileNameMatch = /filename="?([^"]+)"?/i.exec(contentDisposition);
      const resolvedFileName = fileNameMatch?.[1] ?? "karar-defteri-dolu.docx";
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = resolvedFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : "Dolu karar defteri taslagi indirilemedi");
    }
  }

  async function downloadAutoFilledOperatingPlan(): Promise<void> {
    try {
      const response = await fetch(`${apiBase}/api/admin/meeting-documents/operating-plan`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(errorPayload.message ?? "Dolu isletme projesi indirilemedi");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const contentDisposition = response.headers.get("content-disposition") ?? "";
      const fileNameMatch = /filename="?([^"]+)"?/i.exec(contentDisposition);
      const resolvedFileName = fileNameMatch?.[1] ?? "isletme-projesi-dolu.docx";
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = resolvedFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : "Dolu isletme projesi indirilemedi");
    }
  }

  async function downloadAutoFilledNotificationList(): Promise<void> {
    try {
      const response = await fetch(`${apiBase}/api/admin/meeting-documents/notification-list`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(errorPayload.message ?? "Dolu teblig takip listesi indirilemedi");
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const contentDisposition = response.headers.get("content-disposition") ?? "";
      const fileNameMatch = /filename="?([^"]+)"?/i.exec(contentDisposition);
      const resolvedFileName = fileNameMatch?.[1] ?? "teblig-takip-listesi-dolu.docx";
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = resolvedFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : "Dolu teblig takip listesi indirilemedi");
    }
  }

  return (
    <section className="dashboard report-page meeting-guide-page">
      <div className="card table-card report-page-card meeting-hero-card">
        <div className="section-head report-toolbar meeting-hero-head">
          <h3>Toplanti Rehberi ve Evrak Hazirligi</h3>
          <span className="meeting-hero-badge">Operasyon Rehberi</span>
        </div>
        <p className="small meeting-hero-text">
          Kat Malikleri Kurulu toplantilarini tek bir standart ile yonetmek, kritik sureleri kacirmamak ve toplanti
          evraklarini denetime hazir bir duzende tutmak icin tasarlanmis operasyon ekranidir.
        </p>
        <div className="stats-grid compact-row-top-gap meeting-kpi-grid">
          <article className="card stat stat-tone-info">
            <p className="meeting-kpi-line">Asgari Davet Suresi: 15 gun</p>
          </article>
          <article className="card stat stat-tone-good">
            <p className="meeting-kpi-line">1. ve 2. Toplanti Araligi: 7-15 gun</p>
          </article>
          <article className="card stat stat-tone-warn">
            <p className="meeting-kpi-line">Gundem Disi Madde: 1/3 kisi talebi</p>
          </article>
          <article className="card stat stat-tone-danger">
            <p className="meeting-kpi-line">Riskli Alan: Nitelikli cogunluklar</p>
          </article>
        </div>
      </div>

      <div className="card table-card report-page-card">
        <h3>Adim Adim Toplanti Operasyon Akisi</h3>
        <div className="guide-list compact-row-top-gap meeting-step-list">
          {processSteps.map((item) => (
            <article key={item.step} className="card meeting-step-card">
              <div className="meeting-step-top">
                <span className="meeting-step-index">Adim {item.step}</span>
                <p className="small meeting-step-timing">{item.timing}</p>
              </div>
              <h4>{item.title}</h4>
              <ul className="meeting-step-checks">
                {item.checks.map((check) => (
                  <li key={check} className="small">
                    {check}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>

      <div className="card table-card report-page-card">
        <div className="section-head">
          <h3>Standart Gorusme Akisi ve Tutanak Taslaklari</h3>
          <span className="small">Word paketleri sayfanin altindaki Evrak ve Tutanak Hazirlik Paketi alanindadir</span>
        </div>
        <div className="table-wrap compact-row-top-gap">
          <table className="apartment-list-table report-compact-table">
            <thead>
              <tr>
                <th>Sira</th>
                <th>Standart Gorusme Akisi</th>
              </tr>
            </thead>
            <tbody>
              {standardAgendaDocuments.map((item) => (
                <tr key={item.order}>
                  <td>{item.order}</td>
                  <td>{item.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card table-card report-page-card">
        <h3>Nitelikli Cogunluk ve 1/3 Kurali (Kritik Notlar)</h3>
        <div className="table-wrap compact-row-top-gap">
          <table className="apartment-list-table report-compact-table">
            <thead>
              <tr>
                <th>Konu</th>
                <th>Dikkat Edilecek Kural</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Gundeme ek madde talebi</td>
                <td>Toplantida bulunan kat maliklerinin 1/3 kisi sayisi talebi gerekir (arsa payi degil).</td>
              </tr>
              <tr>
                <td>Yonetici secimi / azil</td>
                <td>Kanunda belirtilen ozel cogunluk turlerine gore degerlendirilir; salt cogunlukla karistirilmamalidir.</td>
              </tr>
              <tr>
                <td>Faydali yenilik ve ilaveler (ornek: mantolama)</td>
                <td>Genel kuraldan farkli nitelikli cogunluk aranabilir; karar oncesi oran net kontrol edilmelidir.</td>
              </tr>
              <tr>
                <td>Yonetim plani degisikligi</td>
                <td>Yuksek nitelikli cogunluk gerektirebilir; toplanti oncesi hukuki oran teyidi yapilmalidir.</td>
              </tr>
              <tr>
                <td>Arsa payini etkileyen kararlar</td>
                <td>Standart gundem karari gibi ele alinmaz; ozel cogunluk ve belge duzeni gerekir.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card table-card report-page-card">
        <h3>Toplanti Sonrasi Zorunlu Kontrol Listesi</h3>
        <div className="guide-list compact-row-top-gap">
          <article className="card meeting-checklist-card">
            <ul className="meeting-checklist">
              {postMeetingChecklist.map((item) => (
                <li key={item} className="small">
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>

      <div className="card table-card report-page-card">
        <h3>Evrak ve Tutanak Hazirlik Paketi</h3>
        <p className="small">Yukaridaki adimlara gore hazirlanacak temel evraklar:</p>
        <div className="table-wrap compact-row-top-gap">
          <table className="apartment-list-table report-compact-table">
            <thead>
              <tr>
                <th>Belge</th>
                <th>Amac</th>
                <th>Word</th>
              </tr>
            </thead>
            <tbody>
              {evrakPackDocuments.map((item) => (
                <tr key={item.fileName}>
                  <td>{item.label}</td>
                  <td>{item.purpose}</td>
                  <td>
                    {item.mode === "AUTO_FILL" ? (
                      <button
                        type="button"
                        className="btn btn-primary meeting-word-btn"
                        onClick={() => void downloadAutoFilledInvitation()}
                      >
                        Word Indir
                      </button>
                    ) : item.mode === "AUTO_FILL_ATTENDANCE" ? (
                      <button
                        type="button"
                        className="btn btn-primary meeting-word-btn"
                        onClick={() => void downloadAutoFilledAttendanceSheet()}
                      >
                        Word Indir
                      </button>
                    ) : item.mode === "AUTO_FILL_MINUTES" ? (
                      <button
                        type="button"
                        className="btn btn-primary meeting-word-btn"
                        onClick={() => void downloadAutoFilledMinutes()}
                      >
                        Word Indir
                      </button>
                    ) : item.mode === "AUTO_FILL_DECISION_BOOK" ? (
                      <button
                        type="button"
                        className="btn btn-primary meeting-word-btn"
                        onClick={() => void downloadAutoFilledDecisionBook()}
                      >
                        Word Indir
                      </button>
                    ) : item.mode === "AUTO_FILL_OPERATING_PLAN" ? (
                      <button
                        type="button"
                        className="btn btn-primary meeting-word-btn"
                        onClick={() => void downloadAutoFilledOperatingPlan()}
                      >
                        Word Indir
                      </button>
                    ) : item.mode === "AUTO_FILL_NOTIFICATION_LIST" ? (
                      <button
                        type="button"
                        className="btn btn-primary meeting-word-btn"
                        onClick={() => void downloadAutoFilledNotificationList()}
                      >
                        Word Indir
                      </button>
                    ) : (
                      <a className="btn btn-ghost meeting-word-btn" href={`/${item.fileName}`} download>
                        Word Indir
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
