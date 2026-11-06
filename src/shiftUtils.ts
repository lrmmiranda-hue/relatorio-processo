export type ShiftKey = 'shift1' | 'shift2' | 'shift3';

export interface ShiftInfo {
  key: ShiftKey;
  name: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  description: string;
}

export const SHIFTS_CONFIG: Record<ShiftKey, ShiftInfo> = {
  shift1: {
    key: 'shift1',
    name: '1º Turno',
    startTime: '06:00',
    endTime: '14:00',
    description: '06:00 às 14:00'
  },
  shift2: {
    key: 'shift2',
    name: '2º Turno',
    startTime: '14:00',
    endTime: '23:00',
    description: '14:00 às 23:00'
  },
  shift3: {
    key: 'shift3',
    name: '3º Turno',
    startTime: '22:18',
    endTime: '06:30',
    description: '22:18 às 06:30'
  }
};

/**
 * Retorna a data no formato YYYY-MM-DD no fuso horário local
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converte HH:mm em minutos desde o início do dia
 */
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Verifica se o momento atual corresponde ao turno e à data informada
 */
export function isShiftTimeActive(shiftKey: ShiftKey, targetDateStr: string, now: Date = new Date()): boolean {
  const currentDateStr = getLocalDateString(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const cfg = SHIFTS_CONFIG[shiftKey];
  const startMin = timeToMinutes(cfg.startTime);
  const endMin = timeToMinutes(cfg.endTime);

  if (shiftKey === 'shift1') {
    // 06:00 - 14:00 (mesmo dia)
    if (targetDateStr !== currentDateStr) return false;
    return currentMinutes >= startMin && currentMinutes < endMin;
  }

  if (shiftKey === 'shift2') {
    // 14:00 - 23:00 (mesmo dia)
    if (targetDateStr !== currentDateStr) return false;
    return currentMinutes >= startMin && currentMinutes < endMin;
  }

  if (shiftKey === 'shift3') {
    // 22:18 às 06:30 (atravessa a meia-noite)
    if (currentMinutes >= startMin) {
      // 22:18 até 23:59 -> a data do turno é a de hoje
      return targetDateStr === currentDateStr;
    } else if (currentMinutes < endMin) {
      // 00:00 até 06:30 -> a data pode ser considerada a de ontem (início da noite de trabalho) ou a de hoje
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);
      return targetDateStr === currentDateStr || targetDateStr === yesterdayStr;
    }
    return false;
  }

  return false;
}

/**
 * Detecta qual é o turno em andamento agora
 */
export function getCurrentActiveShift(now: Date = new Date()): ShiftKey {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  if (currentMinutes >= timeToMinutes('06:00') && currentMinutes < timeToMinutes('14:00')) {
    return 'shift1';
  }
  if (currentMinutes >= timeToMinutes('14:00') && currentMinutes < timeToMinutes('22:18')) {
    return 'shift2';
  }
  return 'shift3';
}
