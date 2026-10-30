export const DEFAULT_MACHINES: string[] = [
  "CÉLULA 26",
  "CÉLULA 27",
  "CÉLULA 36",
  "CÉLULA 37",
  "CÉLULA 38",
  "CÉLULA 39",
  "CÉLULA 40",
  "CÉLULA 41",
  "CÉLULA 42",
  "CÉLULA 43",
  "CÉLULA 44",
  "CÉLULA 45",
  "CÉLULA 46",
  "CÉLULA 47",
  "CÉLULA 48",
  "CÉLULA 49",
  "CÉLULA 50",
  "CÉLULA 51",
  "CÉLULA 52",
  "CÉLULA 53",
  "CÉLULA 54",
  "CÉLULA 55",
  "CÉLULA 56",
  "CÉLULA 57",
  "CÉLULA 58"
];

// Peças base das máquinas conforme preenchimento consolidado do dia 29/10/2026 (código de 4 dígitos)
export const INITIAL_MACHINE_PARTS: Record<string, string> = {
  "CÉLULA 26": "2695",
  "CÉLULA 27": "2698",
  "CÉLULA 36": "2662",
  "CÉLULA 37": "2439",
  "CÉLULA 38": "2677",
  "CÉLULA 39": "2695",
  "CÉLULA 40": "2736",
  "CÉLULA 41": "2674",
  "CÉLULA 42": "2676",
  "CÉLULA 43": "2711",
  "CÉLULA 44": "2711",
  "CÉLULA 45": "2711",
  "CÉLULA 46": "2633",
  "CÉLULA 47": "2702",
  "CÉLULA 48": "2750",
  "CÉLULA 49": "2750",
  "CÉLULA 50": "2748",
  "CÉLULA 51": "2555",
  "CÉLULA 52": "2661",
  "CÉLULA 53": "2661",
  "CÉLULA 54": "2772",
  "CÉLULA 55": "2683",
  "CÉLULA 56": "2746",
  "CÉLULA 57": "2749",
  "CÉLULA 58": "2749"
};

// Formata e sanitiza o código da peça para manter exatamente o padrão de 4 dígitos (ex: '022695US' -> '2695', '032698US' -> '2698')
export function sanitizePartCode(val: string): string {
  const clean = (val || '').trim().toUpperCase();
  if (!clean) return '';
  
  // Extrai 4 dígitos caso tenha prefixos como '02', '03' e sufixo 'US'
  const matchPrefix = clean.match(/^(?:02|03)?(\d{4})(?:US|UA)?$/);
  if (matchPrefix) {
    return matchPrefix[1];
  }
  
  // Se contiver 4 dígitos numéricos consecutivos
  const match4 = clean.match(/\d{4}/);
  if (clean.length > 4 && match4) {
    return match4[0];
  }

  return clean.slice(0, 8);
}

