import type {
  DetectedMatch,
  DetectorConfig,
  EntityType,
  Finding,
  SourceDocument,
} from "./types.js";

const PATTERNS: Array<{ type: EntityType; pattern: RegExp }> = [
  {
    type: "EMAIL",
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  },
  {
    type: "PHONE",
    pattern: /(?:0\d{1,4}-\d{1,4}-\d{3,4}|0\d{9,10})/g,
  },
  {
    type: "AMOUNT",
    pattern: /(?:[¥￥]?\d{1,3}(?:,\d{3})*|\d+)(?:円|万円|億円)/g,
  },
  {
    type: "DATE",
    pattern: /\d{4}年\d{1,2}月\d{1,2}日|\d{4}-\d{1,2}-\d{1,2}|\d{4}\/\d{1,2}\/\d{1,2}/g,
  },
];

const CONFIGURED_PATTERNS: Record<EntityType, RegExp> = {
  CUSTOM: /$a/g,
  PERSON_NAME: /$a/g,
  COMPANY_NAME:
    /(?:株式会社|有限会社|合同会社)[^\s、。]+|[^\s、。]+(?:株式会社|有限会社|合同会社)/g,
  DEPARTMENT: /[^\s、。]*(?:部|課|室|グループ)/g,
  ROLE_TITLE: /(?:代表取締役|取締役|部長|課長|係長|担当者)/g,
  EMAIL: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  PHONE: /(?:0\d{1,4}-\d{1,4}-\d{3,4}|0\d{9,10})/g,
  POSTAL_CODE: /\b\d{3}-\d{4}\b/g,
  ADDRESS: /(?:東京都|北海道|(?:京都|大阪)府|.{2,3}県)[^\s、。]*/g,
  AMOUNT: /(?:[¥￥]?\d{1,3}(?:,\d{3})*|\d+)(?:円|万円|億円)/g,
  DATE: /\d{4}年\d{1,2}月\d{1,2}日|\d{4}-\d{1,2}-\d{1,2}|\d{4}\/\d{1,2}\/\d{1,2}/g,
  CUSTOMER_ID: /CUST-\d{4}-\d{3,6}/g,
  CASE_ID: /[A-Z]{2,}-\d{4}-\d{3,5}/g,
  INVOICE_ID: /INV-\d{4}-\d{3,6}/g,
  CONTRACT_ID: /CTR-\d{4}-\d{3,6}/g,
  PROJECT_NAME: /(?:案件名|プロジェクト名)[:：]\s*[^\n\r、。]+/g,
  REVIEW_REQUIRED: /$a/g,
};

export function detectAll(
  input: string,
  dictionaryTerms: string[],
): DetectedMatch[] {
  return [
    ...detectDictionaryTerms(input, dictionaryTerms),
    ...PATTERNS.flatMap(({ type, pattern }) => detectPattern(input, type, pattern)),
  ];
}

export function detectFindings(
  docs: SourceDocument[],
  detectors: DetectorConfig[],
  dictionaryTerms: string[],
): Finding[] {
  const findings: Finding[] = [];

  for (const doc of docs) {
    for (const detector of detectors) {
      const matches =
        detector.type === "dictionary"
          ? detectConfiguredDictionary(
              doc.text,
              detector.entity,
              dictionaryTerms,
            )
          : detectConfiguredPattern(doc.text, detector.entity);

      for (const match of matches) {
        findings.push({
          id: `${doc.id}:${findings.length + 1}`,
          documentId: doc.id,
          entity: match.type,
          value: match.value,
          start: match.start,
          end: match.end,
          detectorId: detector.id,
          confidence: detector.type === "dictionary" ? "high" : "medium",
        });
      }
    }
  }

  return findings;
}

function detectDictionaryTerms(
  input: string,
  dictionaryTerms: string[],
): DetectedMatch[] {
  const terms = [...new Set(dictionaryTerms.map((term) => term.trim()))]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  return terms.flatMap((term) => {
    const matches: DetectedMatch[] = [];
    let start = input.indexOf(term);

    while (start !== -1) {
      matches.push({
        type: "CUSTOM",
        value: term,
        start,
        end: start + term.length,
      });
      start = input.indexOf(term, start + term.length);
    }

    return matches;
  });
}

function detectPattern(
  input: string,
  type: EntityType,
  pattern: RegExp,
): DetectedMatch[] {
  return [...input.matchAll(pattern)].map((match) => {
    const start = match.index ?? 0;
    return {
      type,
      value: match[0],
      start,
      end: start + match[0].length,
    };
  });
}

function detectConfiguredDictionary(
  input: string,
  type: EntityType,
  dictionaryTerms: string[],
): DetectedMatch[] {
  return detectDictionaryTerms(input, dictionaryTerms).map((match) => ({
    ...match,
    type,
  }));
}

function detectConfiguredPattern(
  input: string,
  type: EntityType,
): DetectedMatch[] {
  return detectPattern(input, type, CONFIGURED_PATTERNS[type]);
}
