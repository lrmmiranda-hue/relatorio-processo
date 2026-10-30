import { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Save, 
  Lock, 
  Unlock, 
  KeyRound, 
  CheckCircle2, 
  Trash2, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Loader2, 
  FileText, 
  Eye, 
  PenLine, 
  Menu, 
  Filter,
  History,
  ArrowRight,
  Sun,
  Moon,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import logo1Img from './assets/logo1.png';
import { 
  auth, 
  getDailyReportFirebase, 
  saveDailyReportFirebase, 
  getUserProfileFirebase,
  searchAllDailyReportsFirebase
} from './firebase';
import type { GlobalSearchResult } from './firebase';
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
import { MenuDrawer } from './components/MenuDrawer';
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
  const [, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Desbloqueio de turnos fora do horário com senha
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [unlockedShifts, setUnlockedShifts] = useState<Record<ShiftKey, boolean>>({
    shift1: false,
    shift2: false,
    shift3: false
  });

  // Tema da Interface: Modo Escuro vs Modo Claro
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('relatorio_processo_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('relatorio_processo_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Menu lateral drawer
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Menu popup do perfil / login circular
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Filtros de interface
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMachineFilter, setSelectedMachineFilter] = useState<string>('ALL');
  const [filterOnlyWithNotes, setFilterOnlyWithNotes] = useState(false);
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<'ALL' | 'shift1' | 'shift2' | 'shift3'>('ALL');

  // Busca Global em Todos os Relatórios e Datas
  const [globalSearchResults, setGlobalSearchResults] = useState<GlobalSearchResult[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState<boolean>(false);
  const [hasSearchedGlobal, setHasSearchedGlobal] = useState<boolean>(false);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setGlobalSearchResults([]);
      setHasSearchedGlobal(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingGlobal(true);
      setHasSearchedGlobal(true);
      try {
        const results = await searchAllDailyReportsFirebase(q);
        setGlobalSearchResults(results);
      } catch (err) {
        console.error('Erro na pesquisa global:', err);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedMachineFilter('ALL');
    setFilterOnlyWithNotes(false);
    setSelectedShiftFilter('ALL');
    setGlobalSearchResults([]);
    setHasSearchedGlobal(false);
  };

  // Relógio em tempo real
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitora autenticação do Firebase e restaura sessão salva de Usuário
  useEffect(() => {
    const savedUserStr = localStorage.getItem('relatorio_processo_active_user');
    if (savedUserStr) {
      try {
        const parsed = JSON.parse(savedUserStr);
        setUserProfile(parsed);
      } catch (e) {
        console.error(e);
      }
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const profile = await getUserProfileFirebase(user.uid);
        if (profile) {
          setUserProfile(profile);
          localStorage.setItem('relatorio_processo_active_user', JSON.stringify(profile));
        }
      } else {
        if (!localStorage.getItem('relatorio_processo_active_user')) {
          setUserProfile(null);
        }
      }
    });
    return () => unsub();
  }, []);

  // Desconectar sessão (Usuário ou Administrador)
  const handleLogout = async () => {
    localStorage.removeItem('relatorio_processo_active_user');
    setUserProfile(null);
    setCurrentUser(null);
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Erro ao deslogar:", err);
    }
  };

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

  // Lista consolidada de máquinas (padrão + registradas no relatório)
  const allMachines = useMemo(() => {
    const set = new Set([...DEFAULT_MACHINES]);
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
  }, [report]);

  // Filtro de máquinas na tela
  const filteredMachines = useMemo(() => {
    return allMachines.filter((m) => {
      if (selectedMachineFilter !== 'ALL' && m !== selectedMachineFilter) return false;
      const matchSearch = m.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;
      if (filterOnlyWithNotes) {
        const val = report?.shifts?.[activeShift]?.machines?.[m]?.trim();
        return Boolean(val);
      }
      return true;
    });
  }, [allMachines, selectedMachineFilter, searchQuery, filterOnlyWithNotes, report, activeShift]);

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

  const currentShiftData = report?.shifts?.[activeShift] || getEmptyShift();

  // Controles de Modo (Leitura/Preencher), Data e Turnos
  const renderHeaderControls = () => (
    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar flex-nowrap shrink-0">
      {/* Seletor de Modo: Leitura vs Preenchimento */}
      <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-xl shrink-0">
        <button
          onClick={() => setViewMode('READ')}
          className={`flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
            viewMode === 'READ'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
          title="Visualizar matriz de todas as máquinas nos 3 turnos"
        >
          <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>Leitura</span>
        </button>
        <button
          onClick={() => setViewMode('EDIT')}
          className={`flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
            viewMode === 'EDIT'
              ? 'bg-cyan-500 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
          title="Preencher apontamentos do turno"
        >
          <PenLine className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>Preencher</span>
        </button>
      </div>

      {/* Navegação de Data - Colocada DIRETAMENTE NA FRENTE DO PREENCHER */}
      <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-xl border border-slate-800 shrink-0">
        <button
          onClick={() => handleShiftDate(-1)}
          className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
          title="Dia anterior"
        >
          <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>

        <div className="flex items-center px-1 text-cyan-300 font-mono font-bold text-[11px] sm:text-xs">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-0 py-0.5 bg-transparent text-[11px] sm:text-xs font-bold font-mono text-cyan-300 focus:outline-none cursor-pointer border-none"
          />
        </div>

        <button
          onClick={() => handleShiftDate(1)}
          className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
          title="Próximo dia"
        >
          <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>

        {selectedDate !== getLocalDateString() && (
          <button
            onClick={() => setSelectedDate(getLocalDateString())}
            className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 transition-colors cursor-pointer"
            title="Voltar para Hoje"
          >
            Hoje
          </button>
        )}
      </div>

      {/* Seletor dos 3 Turnos: Colocado DIRETAMENTE DO LADO DA DATA */}
      <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto shrink-0">
        {(['shift1', 'shift2', 'shift3'] as const).map((sk) => {
          const cfg = SHIFTS_CONFIG[sk];
          const isSelected = activeShift === sk;
          const isNow = isShiftTimeActive(sk, selectedDate, currentTime);
          const isUnlocked = unlockedShifts[sk];
          const shiftLabels: Record<ShiftKey, string> = {
            shift1: '1º Turno',
            shift2: '2º Turno',
            shift3: '3º Turno'
          };

          return (
            <button
              key={sk}
              onClick={() => {
                setActiveShift(sk);
                if (viewMode === 'READ') {
                  setSelectedShiftFilter(sk);
                }
              }}
              title={`${cfg.name} (${cfg.startTime} - ${cfg.endTime})`}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span>{shiftLabels[sk]}</span>

              {/* Indicador de Status do Turno */}
              {isNow ? (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"
                  title="Turno em andamento no momento"
                />
              ) : isAdmin || isUnlocked ? (
                <span title="Edição liberada pelo administrador" className="shrink-0">
                  <Unlock className="w-2.5 h-2.5 text-cyan-400" />
                </span>
              ) : (
                <span title="Fora do horário do turno" className="shrink-0">
                  <Lock className="w-2.5 h-2.5 text-slate-500" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white ${theme}`}>
      {/* ── TOPO DA APLICAÇÃO (ULTRA COMPACTO PARA CELULAR E DESKTOP) ── */}
      <header className="no-print bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-2.5 py-1.5 sm:px-4 sm:py-2">
        <div className="max-w-7xl mx-auto flex flex-col gap-1.5">
          {/* LINHA SUPERIOR: Logo ATMS (canto esquerdo), Controles no modo PC (centro), Salvar e Menu/Login (canto direito) */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Canto Esquerdo: Logo ATMS do sistema */}
            <div className="flex items-center gap-2 min-w-0 shrink-0">
              <img src={logo1Img} alt="ATMS" className="h-6 sm:h-7 w-auto object-contain shrink-0" />
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-tight truncate">
                  Diário de Processo & Turnos
                </h1>
                <div className="flex items-center gap-1.5 text-[9px] sm:text-[11px] text-slate-400">
                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-500 shrink-0" />
                  <span>{currentTime.toLocaleTimeString()}</span>
                  <span>•</span>
                  <span className="font-semibold text-cyan-400">
                    {SHIFTS_CONFIG[getCurrentActiveShift(currentTime)].name}
                  </span>
                </div>
              </div>
            </div>

            {/* MODO COMPUTADOR: Leitura/Preencher, Data e Turnos NA PARTE DE CIMA */}
            <div className="hidden sm:flex items-center shrink-0">
              {renderHeaderControls()}
            </div>

            {/* Canto Superior Direito: Alternar Tema (sem fundo) e Login Circular */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Alternar Modo Claro/Escuro: Sem fundo, apenas o ícone */}
              <button
                onClick={toggleTheme}
                className="p-1.5 text-slate-400 hover:text-amber-400 dark:hover:text-amber-300 transition-colors cursor-pointer flex items-center justify-center rounded-lg"
                title={theme === 'dark' ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 hover:scale-110 transition-transform" />
                ) : (
                  <Moon className="w-4 h-4 text-cyan-400 hover:scale-110 transition-transform" />
                )}
              </button>

              {/* Login em Formato Círculo com a Inicial do Usuário */}
              <div className="relative">
                {userProfile ? (
                  <>
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="w-8 h-8 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center justify-center uppercase cursor-pointer ring-2 ring-transparent hover:ring-cyan-300 transition-all select-none shadow-sm"
                      title={`Usuário: ${userProfile.username || userProfile.name} - Clique para opções`}
                    >
                      {(userProfile.username || userProfile.name || 'U').charAt(0).toUpperCase()}
                    </button>

                    {isProfileMenuOpen && (
                      <>
                        {/* Backdrop transparente para fechar ao clicar fora */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setIsProfileMenuOpen(false)}
                        />

                        {/* Menu popup flutuante */}
                        <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 animate-fade-in">
                          <div className="px-2.5 py-1.5 border-b border-slate-800 mb-1">
                            <div 
                              className="text-xs font-bold text-white truncate"
                              title={userProfile.username || userProfile.name || ''}
                            >
                              {userProfile.username || userProfile.name}
                            </div>
                            <div className="text-[10px] text-cyan-400 font-mono font-semibold">
                              {isAdmin ? 'ADMINISTRADOR' : 'OPERADOR'}
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setIsProfileMenuOpen(false);
                              handleLogout();
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Desconectar</span>
                          </button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 flex items-center justify-center cursor-pointer transition-all shadow-sm"
                    title="Entrar com Usuário ou Administrador"
                  >
                    <UserIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* MODO CELULAR: Apenas no mobile exibe o botão Menu */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="sm:hidden relative p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-400 border border-slate-700 transition-colors cursor-pointer shadow-sm flex items-center gap-1"
                title="Abrir Menu (Filtros, Modo Claro, Deslogar)"
              >
                <Menu className="w-4 h-4 text-cyan-400" />
                {(searchQuery.trim() || filterOnlyWithNotes || selectedShiftFilter !== 'ALL' || selectedMachineFilter !== 'ALL') && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse absolute -top-0.5 -right-0.5" />
                )}
              </button>
            </div>
          </div>

          {/* LINHA INFERIOR: Apenas no Modo Celular (no computador fica na parte de cima) */}
          <div className="sm:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-slate-800/60 flex-nowrap">
            {renderHeaderControls()}
          </div>
        </div>
      </header>

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
      <main className="no-print flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 py-3 space-y-3">
        {/* ── PAINEL DE RESULTADOS DA BUSCA GLOBAL (TODOS OS RELATÓRIOS E DATAS) ── */}
        {hasSearchedGlobal && (
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-3.5 space-y-3 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400 shrink-0" />
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  Busca em Todos os Relatórios e Datas:
                  <span className="text-cyan-300 ml-1.5 font-normal">"{searchQuery}"</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {isSearchingGlobal ? (
                  <div className="flex items-center gap-1.5 text-xs text-cyan-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-[11px]">Consultando...</span>
                  </div>
                ) : (
                  <span className="text-[11px] font-mono text-slate-400">
                    {globalSearchResults.length} encontrada{globalSearchResults.length === 1 ? '' : 's'}
                  </span>
                )}
                <button
                  onClick={() => {
                    setHasSearchedGlobal(false);
                    setGlobalSearchResults([]);
                    setSearchQuery('');
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
                >
                  ✕ Fechar
                </button>
              </div>
            </div>

            {isSearchingGlobal ? (
              <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                <span>Buscando informações em todo o histórico de relatórios...</span>
              </div>
            ) : globalSearchResults.length === 0 ? (
              <div className="py-5 text-center text-slate-400 text-xs italic">
                Nenhum apontamento encontrado em nenhum relatório anterior para "{searchQuery}".
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {globalSearchResults.map((item, idx) => {
                  const [y, m, d] = item.date.split('-');
                  const dateBr = `${d}/${m}/${y}`;

                  return (
                    <div
                      key={`${item.date}-${item.shiftKey}-${item.machine}-${idx}`}
                      onClick={() => {
                        setSelectedDate(item.date);
                        setActiveShift(item.shiftKey);
                        setSelectedMachineFilter(item.machine);
                        setHasSearchedGlobal(false);
                      }}
                      className="p-2.5 sm:p-3 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm"
                      title="Clique para abrir este relatório e turno"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-bold text-cyan-400">
                            {dateBr}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {item.shiftName}
                          </span>
                          <span className="text-xs font-bold text-white font-mono">
                            {item.machine}
                          </span>
                          {item.operatorName && (
                            <span className="text-[10px] text-slate-400">
                              • {item.operatorName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                          {item.text}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 group-hover:text-cyan-300 shrink-0 sm:self-center">
                        <span>Ver data</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
          <>
            {/* Aviso ultra compacto de filtros ativos */}
            {(searchQuery.trim() || filterOnlyWithNotes || selectedShiftFilter !== 'ALL' || selectedMachineFilter !== 'ALL') && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs animate-fade-in">
                <div className="flex items-center gap-2 truncate">
                  <Filter className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                  <span className="truncate">
                    Filtro: {selectedMachineFilter !== 'ALL' && `[${selectedMachineFilter}]`} {searchQuery && `"${searchQuery}"`} {filterOnlyWithNotes && '• Com apontamento'} {selectedShiftFilter !== 'ALL' && `• ${selectedShiftFilter === 'shift1' ? '1º Turno' : selectedShiftFilter === 'shift2' ? '2º Turno' : '3º Turno'}`}
                  </span>
                </div>
                <button
                  onClick={handleClearFilters}
                  className="text-xs font-bold text-cyan-300 hover:text-white cursor-pointer shrink-0 ml-2"
                >
                  ✕ Limpar
                </button>
              </div>
            )}

            <MachineMatrixView
              report={report}
              machinesList={allMachines}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onlyWithNotes={filterOnlyWithNotes}
              onToggleOnlyWithNotes={() => setFilterOnlyWithNotes(!filterOnlyWithNotes)}
              selectedShiftFilter={selectedShiftFilter}
              onShiftFilterChange={setSelectedShiftFilter}
              selectedMachineFilter={selectedMachineFilter}
              onMachineFilterChange={setSelectedMachineFilter}
              onOpenMenu={() => setIsMenuOpen(true)}
              onOpenEditShift={(sk) => {
                setActiveShift(sk);
                setViewMode('EDIT');
              }}
            />
          </>
        ) : (
          <>
            {/* ── APONTAMENTOS DAS MÁQUINAS / CÉLULAS ── */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-3 sm:space-y-4">
              {/* Barra de Filtro das Máquinas e Busca Global em Todos os Relatórios */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Filtro das Máquinas */}
                  <select
                    value={selectedMachineFilter}
                    onChange={(e) => setSelectedMachineFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
                    title="Filtrar máquina específica"
                  >
                    <option value="ALL">Todas as Máquinas</option>
                    {allMachines.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  {/* Barra de Pesquisa Global em Todos os Relatórios e Datas */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar em todos os relatórios e datas..."
                      className="px-2.5 py-1.5 pl-8 pr-7 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-48 sm:w-72"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setHasSearchedGlobal(false);
                          setGlobalSearchResults([]);
                        }}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Ver apenas com apontamento */}
                  <button
                    onClick={() => setFilterOnlyWithNotes(!filterOnlyWithNotes)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      filterOnlyWithNotes
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Apenas com Apontamento</span>
                  </button>
                </div>

                {/* Botão Salvar no canto direito, na mesma direção do Apenas com Apontamento */}
                {viewMode === 'EDIT' && (
                  <button
                    onClick={handleSaveReport}
                    disabled={!canEdit || loading || saving}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${
                      saveSuccess
                        ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
                    }`}
                    title="Salvar alterações do relatório"
                  >
                    {saving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : saveSuccess ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Salvo!</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Salvar</span>
                      </>
                    )}
                  </button>
                )}
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
                        <span className="text-sm font-bold text-white tracking-wide font-mono">
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
        onUserIdentified={(profile) => setUserProfile(profile)}
      />

      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        userProfile={userProfile}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedMachineFilter={selectedMachineFilter}
        onMachineFilterChange={setSelectedMachineFilter}
        allMachinesList={allMachines}
        onlyWithNotes={filterOnlyWithNotes}
        onToggleOnlyWithNotes={() => setFilterOnlyWithNotes(!filterOnlyWithNotes)}
        selectedShiftFilter={selectedShiftFilter}
        onShiftFilterChange={setSelectedShiftFilter}
        totalMachinesCount={allMachines.length}
        filteredMachinesCount={filteredMachines.length}
        onClearFilters={handleClearFilters}
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
