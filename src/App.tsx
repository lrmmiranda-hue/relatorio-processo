import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Printer, 
  Save, 
  Lock, 
  Unlock, 
  KeyRound, 
  LogIn, 
  LogOut, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck,
  Loader2,
  FileText,
  Eye,
  PenLine
} from 'lucide-react';
import { auth, getDailyReportFirebase, saveDailyReportFirebase, getUserProfileFirebase } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import type { DailyProcessReport, ShiftReport, UserProfile } from './types';
import { 
  SHIFTS_CONFIG, 
  getLocalDateString, 
  isShiftTimeActive, 
  getCurrentActiveShift 
} from './shiftUtils';
import type { ShiftKey } from './shiftUtils';
import { DEFAULT_MACHINES } from './constants/machines';
import { PasswordUnlockModal } from './components/PasswordUnlockModal';
import { LoginModal } from './components/LoginModal';
import { MachineMatrixView } from './components/MachineMatrixView';

const getEmptyShift = (): ShiftReport => ({
  operatorName: '',
  generalDescription: '',
  machines: {}
});

export default function App() {
  // Modo de visualização: 'READ' (Modo Leitura / Painel Todas as Máquinas) ou 'EDIT' (Preenchimento do Turno)
  const [viewMode, setViewMode] = useState<'READ' | 'EDIT'>('READ');

  // Data e Turno selecionados
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString());
  const [activeShift, setActiveShift] = useState<ShiftKey>(() => getCurrentActiveShift());
  
  // Relatório do dia carregado sob demanda (1 único documento por vez)
  const [report, setReport] = useState<DailyProcessReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Usuário e autenticação
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Desbloqueio de turnos fora do horário com senha
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [unlockedShifts, setUnlockedShifts] = useState<Record<ShiftKey, boolean>>({
    shift1: false,
    shift2: false,
    shift3: false
  });

  // Filtros de interface
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOnlyWithNotes, setFilterOnlyWithNotes] = useState(false);
  const [customMachines, setCustomMachines] = useState<string[]>([]);
  const [newMachineInput, setNewMachineInput] = useState('');
  const [isAddingMachine, setIsAddingMachine] = useState(false);

  // Relógio em tempo real
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitora autenticação do Firebase
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const profile = await getUserProfileFirebase(user.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
    });
    return () => unsub();
  }, []);

  // Busca PONTUAL do relatório da data selecionada
  useEffect(() => {
    let isCancelled = false;
    async function loadData() {
      setLoading(true);
      try {
        const data = await getDailyReportFirebase(selectedDate);
        if (!isCancelled) {
          if (data) {
            setReport(data);
          } else {
            // Inicializa estrutura limpa para o dia
            setReport({
              id: selectedDate,
              date: selectedDate,
              shifts: {
                shift1: getEmptyShift(),
                shift2: getEmptyShift(),
                shift3: getEmptyShift()
              }
            });
          }
        }
      } catch (err) {
        console.error('Falha ao carregar relatório da data:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      isCancelled = true;
    };
  }, [selectedDate]);

  // Lista consolidada de máquinas (padrão + personalizadas + registradas no relatório)
  const allMachines = useMemo(() => {
    const set = new Set([...DEFAULT_MACHINES, ...customMachines]);
    if (report) {
      for (const sk of ['shift1', 'shift2', 'shift3'] as const) {
        const shiftObj = report.shifts?.[sk];
        if (shiftObj?.machines) {
          Object.keys(shiftObj.machines).forEach((m) => set.add(m));
        }
      }
    }
    return Array.from(set).sort((a, b) => {
      const matchA = a.match(/\d+/);
      const matchB = b.match(/\d+/);
      const numA = matchA ? parseInt(matchA[0], 10) : 999999;
      const numB = matchB ? parseInt(matchB[0], 10) : 999999;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
  }, [customMachines, report]);

  // Filtro de máquinas na tela
  const filteredMachines = useMemo(() => {
    return allMachines.filter((m) => {
      const matchSearch = m.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (filterOnlyWithNotes) {
        const val = report?.shifts?.[activeShift]?.machines?.[m]?.trim();
        return Boolean(val);
      }
      return true;
    });
  }, [allMachines, searchQuery, filterOnlyWithNotes, report, activeShift]);

  // Regra de Permissão de Edição
  const isAdmin = userProfile?.role === 'ADMIN';
  const isTimeActive = isShiftTimeActive(activeShift, selectedDate, currentTime);
  const isShiftUnlocked = unlockedShifts[activeShift] === true;
  const canEdit = isAdmin || isTimeActive || isShiftUnlocked;

  // Função para salvar o relatório no Firebase
  const handleSaveReport = async () => {
    if (!report) return;
    setSaving(true);
    try {
      await saveDailyReportFirebase(report);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert('Erro ao salvar no Firebase: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  // Modificação de máquina individual
  const handleMachineChange = (machineName: string, value: string) => {
    if (!canEdit || !report) return;
    const currentShift = report.shifts?.[activeShift] || getEmptyShift();
    const updatedMachines = { ...currentShift.machines };
    if (!value.trim()) {
      delete updatedMachines[machineName];
    } else {
      updatedMachines[machineName] = value;
    }

    setReport({
      ...report,
      shifts: {
        ...report.shifts,
        [activeShift]: {
          ...currentShift,
          machines: updatedMachines
        }
      }
    });
  };

  // Navegação de dias
  const handleShiftDate = (daysDelta: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + daysDelta);
    setSelectedDate(getLocalDateString(dateObj));
  };

  // Adicionar máquina manual
  const handleAddCustomMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachineInput.trim()) return;
    const formatted = newMachineInput.trim().toUpperCase();
    if (!customMachines.includes(formatted)) {
      setCustomMachines([...customMachines, formatted]);
    }
    setNewMachineInput('');
    setIsAddingMachine(false);
  };

  const currentShiftData = report?.shifts?.[activeShift] || getEmptyShift();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* ── TOPO DA APLICAÇÃO ── */}
      <header className="no-print bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Título */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-cyan-600 to-blue-500 rounded-xl shadow-lg shadow-cyan-500/20 text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2">
                Diário de Processo & Turnos
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{currentTime.toLocaleTimeString()}</span>
                <span>•</span>
                <span className="font-semibold text-slate-300">
                  {SHIFTS_CONFIG[getCurrentActiveShift(currentTime)].name}
                </span>
              </div>
            </div>
          </div>

          {/* Seletor de Modo: Leitura vs Preenchimento */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              onClick={() => setViewMode('READ')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'READ'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Visualizar todas as máquinas preenchidas nos 3 turnos"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Modo Leitura</span>
            </button>
            <button
              onClick={() => setViewMode('EDIT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'EDIT'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
              title="Preencher apontamentos do turno"
            >
              <PenLine className="w-3.5 h-3.5" />
              <span>Preencher Turno</span>
            </button>
          </div>

          {/* Ações do Topo */}
          <div className="flex items-center gap-2">
            {/* Navegação de Data (ao lado da impressora) */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => handleShiftDate(-1)}
                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
                title="Dia anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-0.5 rounded-lg bg-transparent text-xs font-bold font-mono text-cyan-300 focus:outline-none cursor-pointer border-none"
              />

              <button
                onClick={() => handleShiftDate(1)}
                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
                title="Próximo dia"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {selectedDate !== getLocalDateString() && (
                <button
                  onClick={() => setSelectedDate(getLocalDateString())}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 transition-colors cursor-pointer ml-0.5"
                  title="Voltar para a data de hoje"
                >
                  Hoje
                </button>
              )}
            </div>

            {/* Botão de Impressão (apenas ícone) */}
            <button
              onClick={() => window.print()}
              disabled={!report || loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
              title="Imprimir relatório diário completo em A4 Paisagem"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Botão Salvar Principal (Visível no modo de edição) */}
            {viewMode === 'EDIT' && (
              <button
                onClick={handleSaveReport}
                disabled={!canEdit || loading || saving}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  saveSuccess
                    ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
                }`}
                title="Salvar alterações do relatório"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Salvo!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span className="hidden sm:inline">Salvar</span>
                  </>
                )}
              </button>
            )}

            {/* Usuário / Login (apenas ícone se não logado) */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-800">
                <div className="text-right hidden lg:block">
                  <div className="text-xs font-semibold text-white truncate max-w-[120px]">
                    {currentUser.email?.split('@')[0]}
                  </div>
                  <div className="text-[9px] text-cyan-400 font-mono">
                    {isAdmin ? 'ADMIN' : 'OPERADOR'}
                  </div>
                </div>
                <button
                  onClick={() => signOut(auth)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 border border-slate-700 transition-colors cursor-pointer"
                  title="Sair da conta"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-colors cursor-pointer"
                title="Entrar"
              >
                <LogIn className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── BARRA DE SELEÇÃO DOS TURNOS (APENAS EM MODO DE EDIÇÃO) ── */}
      {viewMode === 'EDIT' && (
        <section className="no-print bg-slate-900/60 border-b border-slate-800/80 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto no-scrollbar">
              {(['shift1', 'shift2', 'shift3'] as const).map((sk) => {
                const cfg = SHIFTS_CONFIG[sk];
                const isSelected = activeShift === sk;
                const isNow = isShiftTimeActive(sk, selectedDate, currentTime);
                const isUnlocked = unlockedShifts[sk];

                return (
                  <button
                    key={sk}
                    onClick={() => setActiveShift(sk)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <span>{cfg.name}</span>
                    <span className="text-[10px] font-normal text-slate-400 font-mono">
                      ({cfg.startTime} - {cfg.endTime})
                    </span>

                    {/* Indicador de Status do Turno */}
                    {isNow ? (
                      <span
                        className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
                        title="Turno em andamento no momento"
                      />
                    ) : isAdmin || isUnlocked ? (
                      <span title="Edição liberada pelo administrador">
                        <Unlock className="w-3 h-3 text-cyan-400" />
                      </span>
                    ) : (
                      <span title="Fora do horário do turno (bloqueado para operadores)">
                        <Lock className="w-3 h-3 text-slate-500" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── BANNER DE STATUS / BLOQUEIO DE HORÁRIO (APENAS MODO PREENCHIMENTO) ── */}
      {viewMode === 'EDIT' && (
        <div className="no-print max-w-7xl mx-auto w-full px-4 pt-4">
          {isAdmin ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  <strong>Acesso Administrativo:</strong> Você possui liberação irrestrita para editar e auditar qualquer turno e data.
                </span>
              </div>
            </div>
          ) : isShiftUnlocked ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
              <div className="flex items-center gap-2">
                <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Edição Desbloqueada por Senha:</strong> Este turno ({SHIFTS_CONFIG[activeShift].name}) está temporariamente liberado para edição.
                </span>
              </div>
            </div>
          ) : isTimeActive ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Turno Ativo:</strong> Horário permitido para preenchimento ({SHIFTS_CONFIG[activeShift].description}).
              </span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs animate-fade-in">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <strong>Edição Bloqueada:</strong> Este turno está fora do horário permitido de preenchimento ({SHIFTS_CONFIG[activeShift].description}).
                </div>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-md shadow-amber-400/20 shrink-0"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Liberar com Senha</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <main className="no-print flex-1 max-w-7xl mx-auto w-full px-4 py-4 space-y-4">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <span className="text-xs">Carregando diário de bordo do dia...</span>
          </div>
        ) : !report ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Nenhum dado encontrado para esta data.
          </div>
        ) : viewMode === 'READ' ? (
          <MachineMatrixView
            report={report}
            machinesList={allMachines}
            onOpenEditShift={(sk) => {
              setActiveShift(sk);
              setViewMode('EDIT');
            }}
          />
        ) : (
          <>
            {/* ── APONTAMENTOS DAS MÁQUINAS / CÉLULAS ── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
              {/* Barra de Filtro e Busca de Máquinas */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                    Células e Máquinas ({filteredMachines.length})
                  </h2>
                  <span className="text-[11px] text-slate-400">
                    {SHIFTS_CONFIG[activeShift].name}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Busca */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filtrar célula..."
                      className="px-2.5 py-1 pl-8 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36 sm:w-44"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                  </div>

                  {/* Ver apenas com notas */}
                  <button
                    onClick={() => setFilterOnlyWithNotes(!filterOnlyWithNotes)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      filterOnlyWithNotes
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Com Anotação</span>
                  </button>

                  {/* Adicionar Máquina personalizada */}
                  {canEdit && (
                    isAddingMachine ? (
                      <form onSubmit={handleAddCustomMachine} className="flex items-center gap-1">
                        <input
                          type="text"
                          autoFocus
                          value={newMachineInput}
                          onChange={(e) => setNewMachineInput(e.target.value)}
                          placeholder="Ex: CÉLULA 99"
                          className="px-2 py-1 rounded-lg bg-slate-950 border border-cyan-500 text-xs text-white w-28 focus:outline-none font-bold uppercase"
                        />
                        <button
                          type="submit"
                          className="p-1 rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 text-xs font-bold cursor-pointer"
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingMachine(false)}
                          className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => setIsAddingMachine(true)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                        title="Adicionar outra máquina ou célula"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Máquina</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Grade de Máquinas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredMachines.map((machine) => {
                  const val = currentShiftData.machines?.[machine] || '';
                  const hasVal = Boolean(val.trim());

                  return (
                    <div
                      key={machine}
                      className={`p-3 rounded-xl border transition-all ${
                        hasVal
                          ? 'bg-slate-950 border-cyan-500/30 shadow-md shadow-cyan-950/20'
                          : 'bg-slate-950/40 border-slate-800'
                      }`}
                    >
                      {/* Header da Máquina com Botões Rápidos */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-xs font-bold text-white tracking-wide">
                          {machine}
                        </span>

                        {canEdit && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMachineChange(machine, 'OK')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                val === 'OK'
                                  ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50 shadow-xs'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                              }`}
                              title="Marcar máquina como OK"
                            >
                              OK
                            </button>

                            <button
                              type="button"
                              onClick={() => handleMachineChange(machine, 'Sem Bruto')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                val === 'Sem Bruto'
                                  ? 'bg-amber-500/30 text-amber-300 border-amber-500/50 shadow-xs'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                              }`}
                              title="Marcar como Sem Bruto"
                            >
                              Sem Bruto
                            </button>

                            <button
                              type="button"
                              onClick={() => handleMachineChange(machine, 'Manutenção')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                val === 'Manutenção'
                                  ? 'bg-red-500/30 text-red-300 border-red-500/50 shadow-xs'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                              }`}
                              title="Marcar como Manutenção"
                            >
                              Manutenção
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Textarea para observações da máquina */}
                      <textarea
                        rows={2}
                        disabled={!canEdit}
                        value={val}
                        onChange={(e) => handleMachineChange(machine, e.target.value)}
                        placeholder={canEdit ? 'Sem ocorrências ou digite a anotação...' : 'Sem ocorrências.'}
                        className={`w-full p-2 rounded-lg border text-xs focus:outline-none resize-none ${
                          canEdit
                            ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-cyan-500'
                            : 'bg-slate-900/40 border-slate-800 text-slate-400 cursor-not-allowed'
                        }`}
                      />

                      {/* Botão limpar se tiver valor */}
                      {hasVal && canEdit && (
                        <div className="flex justify-end mt-1">
                          <button
                            type="button"
                            onClick={() => handleMachineChange(machine, '')}
                            className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                            title="Limpar anotação desta máquina"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Limpar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── MODAIS ── */}
      <PasswordUnlockModal
        isOpen={isPasswordModalOpen}
        shiftName={SHIFTS_CONFIG[activeShift].name}
        onSuccess={() => {
          setUnlockedShifts({
            ...unlockedShifts,
            [activeShift]: true
          });
        }}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* ── VISUALIZAÇÃO DE IMPRESSÃO (Matriz Completa A4 Paisagem quando em modo de Edição) ── */}
      {report && viewMode === 'EDIT' && (
        <div className="hidden print:block">
          <MachineMatrixView
            report={report}
            machinesList={allMachines}
          />
        </div>
      )}
    </div>
  );
}
