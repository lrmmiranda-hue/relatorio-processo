import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import type { DailyProcessReport, UserProfile } from './types';
import { INITIAL_MACHINE_PARTS } from './constants/machines';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Obtém as peças herdadas para a data (a partir do dia 26/10/2026, mantendo o dia anterior até alteração)
export async function getInheritedMachineParts(targetDate: string): Promise<Record<string, string>> {
  const partsAccumulator: Record<string, string> = { ...INITIAL_MACHINE_PARTS };

  try {
    const snap = await getDocs(collection(db, 'daily_reports'));
    // Ordena as datas anteriores ou iguais a targetDate em ordem cronológica crescente
    const sortedDocs = snap.docs
      .map(d => ({ id: d.id, data: d.data() as DailyProcessReport }))
      .filter(d => d.id <= targetDate && d.id >= '2026-10-26')
      .sort((a, b) => a.id.localeCompare(b.id));

    // Reproduz as atualizações de peças até a data alvo
    for (const d of sortedDocs) {
      if (d.data.machineParts) {
        Object.entries(d.data.machineParts).forEach(([m, p]) => {
          if (p && String(p).trim()) {
            partsAccumulator[m] = String(p).trim();
          }
        });
      }
      for (const sk of ['shift1', 'shift2', 'shift3'] as const) {
        const sParts = d.data.shifts?.[sk]?.machineParts;
        if (sParts) {
          Object.entries(sParts).forEach(([m, p]) => {
            if (p && String(p).trim()) {
              partsAccumulator[m] = String(p).trim();
            }
          });
        }
      }
    }
  } catch (err) {
    console.warn('Não foi possível calcular herança dinâmica de peças:', err);
  }

  return partsAccumulator;
}

// Busca PONTUAL sob demanda de 1 relatório (apenas a data selecionada)
export async function getDailyReportFirebase(dateStr: string): Promise<DailyProcessReport | null> {
  try {
    const docRef = doc(db, 'daily_reports', dateStr);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as DailyProcessReport;
    }
    return null;
  } catch (err) {
    console.error('Erro ao buscar relatório do dia:', err);
    throw err;
  }
}

// Salva pontualmente o relatório no Firebase
export async function saveDailyReportFirebase(report: DailyProcessReport): Promise<void> {
  try {
    const docRef = doc(db, 'daily_reports', report.id);
    const cleanData = JSON.parse(JSON.stringify(report));
    cleanData.updatedAt = Date.now();
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err) {
    console.error('Erro ao salvar relatório:', err);
    throw err;
  }
}

// Deleta pontualmente se necessário
export async function deleteDailyReportFirebase(reportId: string): Promise<void> {
  try {
    const docRef = doc(db, 'daily_reports', reportId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Erro ao excluir relatório:', err);
    throw err;
  }
}

// Busca perfil do usuário logado para verificar se é ADMIN (administrativo)
export async function getUserProfileFirebase(uid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.warn('Não foi possível obter perfil do usuário:', err);
    return null;
  }
}

// Busca lista de todos os perfis de usuários cadastrados no ATMS
export async function getAllUserProfilesFirebase(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data()
    })) as UserProfile[];
  } catch (err) {
    console.error('Erro ao buscar usuários do sistema:', err);
    return [];
  }
}

export interface GlobalSearchResult {
  date: string;
  shiftKey: 'shift1' | 'shift2' | 'shift3';
  shiftName: string;
  machine: string;
  text: string;
  operatorName?: string;
}

// Busca em TODAS as datas e TODOS os relatórios salvos no sistema
export async function searchAllDailyReportsFirebase(query: string): Promise<GlobalSearchResult[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  try {
    const snap = await getDocs(collection(db, 'daily_reports'));
    const results: GlobalSearchResult[] = [];

    const shiftNames: Record<string, string> = {
      shift1: '1º Turno',
      shift2: '2º Turno',
      shift3: '3º Turno'
    };

    snap.docs.forEach((docSnap) => {
      const data = docSnap.data() as DailyProcessReport;
      const date = data.date || docSnap.id;

      if (!data.shifts) return;

      (['shift1', 'shift2', 'shift3'] as const).forEach((sk) => {
        const shiftObj = data.shifts?.[sk];
        if (!shiftObj) return;

        // Procura nas máquinas do turno
        // Procura nas máquinas e peças do turno
        const allTurnMachines = new Set([
          ...Object.keys(shiftObj.machines || {}),
          ...Object.keys(shiftObj.machineParts || {}),
          ...Object.keys(data.machineParts || {})
        ]);

        allTurnMachines.forEach((mName) => {
          const note = shiftObj.machines?.[mName];
          const noteStr = note ? String(note).trim() : '';
          const partStr = shiftObj.machineParts?.[mName] || data.machineParts?.[mName] || '';

          if (!noteStr && !partStr) return;

          // Bate com nome da máquina, texto da peça, texto da anotação, data ou operador
          if (
            mName.toLowerCase().includes(cleanQuery) ||
            partStr.toLowerCase().includes(cleanQuery) ||
            noteStr.toLowerCase().includes(cleanQuery) ||
            date.includes(cleanQuery) ||
            (shiftObj.operatorName && shiftObj.operatorName.toLowerCase().includes(cleanQuery))
          ) {
            results.push({
              date,
              shiftKey: sk,
              shiftName: shiftNames[sk] || sk,
              machine: mName,
              text: partStr ? (noteStr ? `[PEÇA: ${partStr}] ${noteStr}` : `[PEÇA: ${partStr}]`) : noteStr,
              operatorName: shiftObj.operatorName
            });
          }
        });
      });
    });

    // Ordenar pelas datas mais recentes primeiro
    results.sort((a, b) => b.date.localeCompare(a.date));
    return results;
  } catch (err) {
    console.error('Erro ao pesquisar relatórios globais:', err);
    return [];
  }
}
