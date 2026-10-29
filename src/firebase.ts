import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import type { DailyProcessReport, UserProfile } from './types';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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
