/**
 * Bolunme adayi tespiti.
 *
 * Otomatik bolme SADECE elle tanimlanan daire ciftleri icin yapilir
 * (`KNOWN_SPLIT_PAIRS`). Bu modul ise "acikalamasi birden fazla daireye
 * isaret ediyor ama otomatik bolunmedi" satirlari bulmak icindir; sonuclar
 * kullaniciya "Bolunme Ihtimali Olan Tahsilatlar" sayfasinda gosterilir ve
 * bolme karari kullaniciya birakilir.
 *
 * Buradaki kalibin otomatik bolme yapmadigi icin yanlis pozitif vermesi
 * zararsizdir; kullanici listeden "Bolunmesin" diyerek gecebilir.
 */

/** Otomatik bolunmesine izin verilen daire ciftleri. Kullanici tarafindan belirlendi. */
export const KNOWN_SPLIT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ["57", "93"],
  ["48", "65"],
  ["35", "45"],
];

/**
 * Ayni kisinin tek havaleyle iki dairenin odemesini sabit tutarla yaptigi durumlar.
 * Aciklamada odeyen adi ve `fixedDoorNo` geciyorsa `fixedAmount` o daireye, kalan `mainDoorNo`'ya yazilir.
 * Esit bolen `KNOWN_SPLIT_PAIRS` bu durumlar icin yanlis tutar uretir.
 */
export const FIXED_AMOUNT_SPLIT_RULES: ReadonlyArray<{
  payerKeyword: string;
  mainDoorNo: string;
  fixedDoorNo: string;
  fixedAmount: number;
}> = [
  // D3 (babasi) aidat+tadilat, D78 (kendi dairesi, aidati kiraci oduyor) sadece tadilat.
  { payerKeyword: "mustafa yemen agbulut", mainDoorNo: "3", fixedDoorNo: "78", fixedAmount: 3000 },
];

function toAsciiLower(input: string): string {
  return input
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    // Mojibake fallback (cift kodlanmis UTF-8 Latin-1 olarak okundugunda):
    .replace(/Ä±/g, "i")
    .replace(/ÅŸ/g, "s")
    .replace(/ÄŸ/g, "g")
    .replace(/Ã¼/g, "u")
    .replace(/Ã¶/g, "o")
    .replace(/Ã§/g, "c");
}

function parseDoorNosFromFreeText(value: string): string[] {
  if (!value.trim()) {
    return [];
  }

  return value
    .replace(/\bve\b/gi, ",")
    .replace(/\bveya\b/gi, ",")
    .split(/[,;|/&\-\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function collectExplicitPrefixedDoorCaptures(text: string): string[] {
  return [
    ...text.matchAll(/\bdaire(?:ler)?\s*[:#\-\/.]?\s*0*(\d{1,4})\b/g),
    ...text.matchAll(/\bd\s*[#:\/\.\-]\s*0*(\d{1,4})\b/g),
    ...text.matchAll(/\bd\s+0*(\d{1,4})\b/g),
    // "d12" gibi ayracsiz yazim. Otomatik bolmede bu kalip bilinctli olarak
    // kullanilmiyor ("d0galgaz" gibi PDF bozmalari yuzunden), ama aday
    // tespitinde yakalanmasi gerekiyor. `\b` sayidan sonra harf gelmesini
    // engelledigi icin "d0galgaz" buraya da takilmaz.
    ...text.matchAll(/\bd0*(\d{1,4})\b/g),
  ].map((m) => m[1]);
}

/**
 * Aciklamada birden fazla daireye isaret eden kalip var mi?
 * En az iki farkli daire numarasi yakalanirsa liste doner, yoksa bos dizi.
 */
export function detectSplitCandidateDoorNos(description: string | null | undefined): string[] {
  const text = toAsciiLower((description ?? "").trim());
  if (!text.trim()) {
    return [];
  }

  const explicitPrefixed = collectExplicitPrefixedDoorCaptures(text);

  const groupedByKeyword = [
    ...text.matchAll(
      /\b(?:d|daire|daireler)\b[^\d]{0,6}((?:\d{1,4}\s*(?:,|ve|veya|&|\/|-)\s*)+\d{1,4})/g
    ),
  ].flatMap((match) => parseDoorNosFromFreeText(match[1] ?? ""));

  const compactPairs = [
    ...text.matchAll(/\bd\s*0*(\d{1,4})ve(?:d)?\s*0*(\d{1,4})\b/g),
    ...text.matchAll(/\bd\s*0*(\d{1,4})\s*(?:ve|veya|\/|&|-)\s*0*(\d{1,4})\b/g),
    ...text.matchAll(/\b0*(\d{1,4})\s*(?:ve|veya|&)\s*0*(\d{1,4})\b/g),
  ].flatMap((match) => [match[1], match[2]]);

  const merged = [
    ...new Set(
      [...explicitPrefixed, ...groupedByKeyword, ...compactPairs]
        .map((doorNo) => {
          const asNumber = Number(doorNo);
          return Number.isNaN(asNumber) ? doorNo.trim() : String(asNumber);
        })
        .filter(Boolean)
    ),
  ];

  return merged.length >= 2 ? merged : [];
}

/**
 * Ayni banka referansi birden fazla tahsilat kaydinda geciyorsa o banka hareketi
 * daha once dairelere bolunmus demektir. Eski ice aktarimlar BANK_SPLIT: etiketi
 * yazmadigi icin etiket yerine bu sayima bakilir.
 */
export function collectAlreadySplitBankRefs(bankRefs: Array<string | null | undefined>): Set<string> {
  const counts = new Map<string, number>();

  for (const ref of bankRefs) {
    const trimmed = ref?.trim();
    if (!trimmed) {
      continue;
    }
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }

  return new Set([...counts].filter(([, count]) => count > 1).map(([ref]) => ref));
}

export function resolveFixedAmountSplit(
  description: string | null | undefined,
  amount: number
): Array<{ doorNo: string; amount: number }> {
  const text = toAsciiLower((description ?? "").trim());
  if (!text || !Number.isFinite(amount)) {
    return [];
  }

  for (const rule of FIXED_AMOUNT_SPLIT_RULES) {
    if (!text.includes(rule.payerKeyword)) {
      continue;
    }
    if (!new RegExp(`(?:^|\\D)${rule.fixedDoorNo}(?:\\D|$)`).test(text)) {
      continue;
    }
    const mainAmount = Math.round((amount - rule.fixedAmount) * 100) / 100;
    if (mainAmount <= 0) {
      continue;
    }
    return [
      { doorNo: rule.mainDoorNo, amount: mainAmount },
      { doorNo: rule.fixedDoorNo, amount: rule.fixedAmount },
    ];
  }

  return [];
}

/**
 * Aciklama, otomatik bolunmesine izin verilen bir daire ciftine isaret ediyor mu?
 * Bu ciftlerdeki daireler aidatlarini surekli tek islemde odedigi icin,
 * ciftin tek bir uyesinin gecmesi de bolme icin yeterli sayilir.
 */
export function resolveKnownPairDoorNos(description: string | null | undefined): string[] {
  const text = toAsciiLower((description ?? "").trim());
  if (!text.trim()) {
    return [];
  }

  for (const [left, right] of KNOWN_SPLIT_PAIRS) {
    const leftToken = new RegExp(`(?:^|\\D)${left}(?:\\D|$)`);
    const rightToken = new RegExp(`(?:^|\\D)${right}(?:\\D|$)`);

    if (leftToken.test(text) || rightToken.test(text)) {
      return [left, right];
    }
  }

  return [];
}
