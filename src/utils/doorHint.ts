/**
 * Banka aciklamasinda ACIKCA yazilmis daire numarasi.
 *
 * Ayni kisi birden fazla dairenin odemesini yapabildigi icin isim kurali ("OZGUR KOC -> 54")
 * tek basina yeterli degildir; aciklamada acikca "daire 24" ya da "D-24" yaziyorsa o daire
 * isim kuralini gecer. Canli veride aciklamada acik daire no bulunan 872 odemenin 854'unde
 * (%98) atanan daire bununla uyusuyor.
 *
 * Kabul edilen yazimlar (normalize edilmis, kucuk harf ASCII metin uzerinde):
 *  - "daire 24", "daire:24", "daire-24", "daire #24"
 *  - "d-24", "d:24", "d/24", "d.24", "d#24"  (ayirici ZORUNLU)
 * Kabul EDILMEYENLER: "d 24" (bosluk tek basina; "d0galgaz 5" gibi PDF bozmalariyla karisir).
 *
 * Banka aciklamalari ~60 karakterde kesildigi icin metnin en sonundaki sayi
 * ("... daire 3" <- "daire 30") dikkate alinmaz. Birden fazla farkli daire yaziyorsa (ya da
 * yazilan daire sistemde yoksa) sonuc belirsizdir ve `null` doner.
 */

import { normalizeDoorNoForCompare } from "../routes/adminNoteUtils";

const WRITTEN_DOOR_PATTERNS: RegExp[] = [
  /\bdaire\s*[:#\-/.]?\s*0*(\d{1,4})\b/g,
  /\bd\s*[#:/.\-]\s*0*(\d{1,4})\b/g,
];

export function extractWrittenDoorNoFromNormalizedText(
  normalizedText: string,
  doorNoSet: Set<string>
): string | null {
  const text = normalizedText.trim();
  if (!text) {
    return null;
  }

  const found = new Set<string>();
  for (const pattern of WRITTEN_DOOR_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      // Kesilmis aciklama korumasi: eslesme metnin sonunda bitiyorsa sayi eksik olabilir.
      if ((match.index ?? 0) + match[0].length >= text.length) {
        continue;
      }
      found.add(normalizeDoorNoForCompare(match[1]));
    }
  }

  const valid = [...found].filter((doorNo) => doorNoSet.has(doorNo));
  return valid.length === 1 ? valid[0] : null;
}
