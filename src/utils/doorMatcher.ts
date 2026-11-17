/**
 * Banka aciklamasindan daire numarasi cozumleme: SAF fonksiyonlar (veritabani/HTTP yok).
 *
 * Eskiden `routes/admin.ts` icindeydi ve yalnizca tum sunucuyu ayaga kaldirarak denenebiliyordu;
 * her duzeltme (ornegin "D-24" yazan aciklamanin isim kuralini gecmesi) canli veride fark
 * edildikten sonra yapiliyordu. Burada olmasi, duzeltilen her vakanin `doorMatcher.test.ts`
 * icinde sabit bir regresyon ornegine donusmesini saglar.
 *
 * Oncelik sirasi:
 *  1. Isim/anahtar kurallari (Aciklama-Daire Esleme); ayni kisi birden fazla daire oduyorsa
 *     aciklamada ACIKCA yazilan tek daire ("daire 24", "D-24") isim kuralini gecer.
 *  2. "12/74" bicimi (sube/sira + daire) -- tarih parcalariyla karismasin diye sag taraf >= 13.
 *  3. Aciklamada acikca yazilan tek daire.
 */

import { normalizeDoorNoForCompare } from "../routes/adminNoteUtils";
import { extractWrittenDoorNoFromNormalizedText } from "./doorHint";
import { collectExplicitDoorCapturesFromNormalizedText } from "./autoSplit";
import { toAsciiLower } from "./splitCandidate";

export type DoorNoRule = {
  keyword?: string;
  normalizedKeyword: string;
  doorNo: string;
};

export function normalizeKeywordForMatch(value: string): string {
  return toAsciiLower(value)
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDoorPatternText(value: string): string {
  return toAsciiLower(value);
}

export function extractDoorNoFromDescription(
  description: string,
  doorNoSet: Set<string>,
  rules: DoorNoRule[] = []
): string | null {
  const normalizedForMatch = normalizeKeywordForMatch(description);
  const normalizedForMatchPadded = ` ${normalizedForMatch} `;
  const matchedDoorCandidates: Array<{ doorNo: string; score: number }> = [];

  // Rule-only matching: automatic door resolution is driven by Admin's
  // "Aciklama-Daire Esleme" definitions.
  for (const rule of rules) {
    const normalizedRule =
      normalizeKeywordForMatch(rule.keyword ?? "") || normalizeKeywordForMatch(rule.normalizedKeyword ?? "");
    if (!normalizedRule) {
      continue;
    }

    // Boundary-safe contains: prevents partial numeric hits (e.g. "daire 2" matching "daire 23").
    const directMatch = normalizedForMatchPadded.includes(` ${normalizedRule} `);
    const tokenFallbackMatch = !directMatch
      ? (() => {
          const tokens = normalizedRule.split(" ").filter((token) => token.length >= 3);
          if (tokens.length < 2) {
            return false;
          }
          return tokens.every((token) => normalizedForMatch.includes(token));
        })()
      : false;

    if (!directMatch && !tokenFallbackMatch) {
      continue;
    }

    const candidateDoorNo = doorNoSet.has(rule.doorNo)
      ? rule.doorNo
      : (() => {
          const asNumber = String(Number(rule.doorNo));
          return doorNoSet.has(asNumber) ? asNumber : null;
        })();
    if (!candidateDoorNo) {
      continue;
    }

    // Longer keyword means more specific rule (e.g. person name beats generic "daire xx").
    matchedDoorCandidates.push({ doorNo: candidateDoorNo, score: normalizedRule.length });
  }

  if (matchedDoorCandidates.length > 0) {
    matchedDoorCandidates.sort((a, b) => b.score - a.score);
    // Ayni kisi birden fazla dairenin odemesini yapabiliyor (or. "Daire 2 Temmuz aidati*NAIL UMUT AYKURT"
    // isim kurali 78'e gidiyor). Aciklamada acikca "daire N" yaziyorsa o daire isim kuralini gecer.
    const writtenDoor = extractWrittenDaireDoorNo(description, doorNoSet);
    if (writtenDoor && writtenDoor !== matchedDoorCandidates[0].doorNo) {
      return writtenDoor;
    }
    return matchedDoorCandidates[0].doorNo;
  }

  // İş Bankası FAST vb.: "12/74" çoğunlukla ref + daire; iki daire değil. Tarih parçası (28/04/...)
  // ile karışmayı sınırla.
  const branchRefDoor = extractBranchReferenceSuffixDoorNo(description, doorNoSet);
  if (branchRefDoor) {
    return branchRefDoor;
  }

  const explicitDoor = extractSingleExplicitPrefixedDoorNoFromDescription(description, doorNoSet);
  if (explicitDoor) {
    return explicitDoor;
  }

  return null;
}

/**
 * FAST / Havale: "12/74" iki daire değil; çoğu zaman sıra/ref + tek daire (burada 74).
 * Yanlış tarih/DM parçası (28/04/…) (?!\/) ile elenir. Küçük sağ sayılar (≤12) daire ile
 * gün/ay karıştığı için sadece sağ ≥ 13 ise bu kalıpla daire yakalanır; "D:8" vb. kurallardan çözülür.
 */
function extractBranchReferenceSuffixDoorNo(description: string, doorNoSet: Set<string>): string | null {
  const text = normalizeDoorPatternText(description.trim());
  if (!text.trim()) {
    return null;
  }

  const re = /\b(\d{1,2})\/(\d{1,4})\b(?!\s*\/\s*\d{4}\b)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const rawRight = match[2] ?? "";
    const rightNum = Number(rawRight);
    if (!Number.isFinite(rightNum) || rightNum < 13) {
      continue;
    }

    const candidate = normalizeDoorNoForCompare(rawRight);
    if (!doorNoSet.has(candidate)) {
      continue;
    }
    return candidate;
  }

  return null;
}

/**
 * Aciklamada ACIKCA yazilmis tek daire ("daire N" ya da "D-N"); kurallar icin bkz. utils/doorHint.ts.
 */
function extractWrittenDaireDoorNo(description: string, doorNoSet: Set<string>): string | null {
  return extractWrittenDoorNoFromNormalizedText(normalizeDoorPatternText(description), doorNoSet);
}

function extractSingleExplicitPrefixedDoorNoFromDescription(description: string, doorNoSet: Set<string>): string | null {
  const text = normalizeDoorPatternText(description.trim());
  if (!text.trim()) {
    return null;
  }

  const unique = [
    ...new Set(collectExplicitDoorCapturesFromNormalizedText(text).map((x) => normalizeDoorNoForCompare(x))),
  ].filter((doorNo) => doorNoSet.has(doorNo));

  return unique.length === 1 ? unique[0] : null;
}

