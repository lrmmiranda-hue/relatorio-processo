import React from 'react';
import { 
  X, 
  Sun, 
  Moon, 
  Search, 
  Filter, 
  LogOut, 
  LogIn, 
  User as UserIcon, 
  FileText, 
  RotateCcw,
  Check
} from 'lucide-react';
import type { UserProfile } from '../types';
import logo1Img from '../assets/logo1.png';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  // Usuário
  userProfile: UserProfile | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  // Tema
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  // Filtros de Máquinas
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedMachineFilter: string;
  onMachineFilterChange: (machine: string) => void;
  allMachinesList: string[];
  onlyWithNotes: boolean;
  onToggleOnlyWithNotes: () => void;
  selectedShiftFilter: 'ALL' | 'shift1' | 'shift2' | 'shift3';
  onShiftFilterChange: (shift: 'ALL' | 'shift1' | 'shift2' | 'shift3') => void;
  totalMachinesCount: number;
  filteredMachinesCount: number;
  onClearFilters: () => void;
}

export const MenuDrawer: React.FC<MenuDrawerProps> = ({
  isOpen,
  onClose,
  userProfile,
  onOpenLogin,
  onLogout,
  theme,
  onToggleTheme,
  searchQuery,
  onSearchChange,
  selectedMachineFilter,
  onMachineFilterChange,
  allMachinesList,
  onlyWithNotes,
  onToggleOnlyWithNotes,
  selectedShiftFilter,
  onShiftFilterChange,
  totalMachinesCount,
  filteredMachinesCount,
  onClearFilters
}) => {
  if (!isOpen) return null;

  const hasActiveFilters = Boolean(
    searchQuery.trim() || 
    onlyWithNotes || 
    selectedShiftFilter !== 'ALL' || 
    selectedMachineFilter !== 'ALL'
  );
  const isAdmin = userProfile?.role === 'ADMIN';

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in no-print">
      {/* Backdrop com desfoque */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer deslizante da direita */}
      <div className="relative w-full max-w-sm sm:max-w-md bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col h-full shadow-2xl z-10 overflow-hidden">
        {/* Cabeçalho do Menu */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <img src={logo1Img} alt="ATMS" className="h-7 w-auto object-contain" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Menu do Sistema</h2>
              <p className="text-[10px] text-slate-400">Ajustes, Filtros e Sessão</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            title="Fechar menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo com rolagem customizada */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
          {/* ── SEÇÃO: SESSÃO DO USUÁRIO ── */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Identificação
              </span>
              {userProfile && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isAdmin ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-300'
                }`}>
                  {isAdmin ? 'ADMINISTRADOR' : 'OPERADOR'}
                </span>
              )}
            </div>

            {userProfile ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white truncate">
                      {userProfile.username || userProfile.name || 'Usuário'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {userProfile.email || 'Acesso local ATMS'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 hover:text-red-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Deslogar da Conta</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-400">
                  Você está navegando em modo visualização de turno.
                </p>
                <button
                  onClick={() => {
                    onOpenLogin();
                    onClose();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Entrar com Usuário ou Administrador</span>
                </button>
              </div>
            )}
          </div>

          {/* ── SEÇÃO: ALTERNAR MODO CLARO / ESCURO ── */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Aparência Visual
              </span>
              <span className="text-[11px] font-semibold text-cyan-400">
                {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
              </span>
            </div>

            <button
              onClick={onToggleTheme}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 text-xs font-bold flex items-center justify-between transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
                    <span>Mudar para Modo Claro</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-cyan-400" />
                    <span>Mudar para Modo Escuro</span>
                  </>
                )}
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Alternar
              </span>
            </button>
          </div>

          {/* ── SEÇÃO: FILTRO POR MÁQUINA / CÉLULA ── */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Filtro por Máquina
                </span>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={onClearFilters}
                  className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  title="Resetar filtros"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Limpar</span>
                </button>
              )}
            </div>

            {/* Campo de Busca Histórica / Global */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Buscar em todos os relatórios e datas:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Ex: 504, inserto, manutenção..."
                  className="w-full px-3 py-2 pl-9 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Filtro das Máquinas */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Filtrar máquina específica:
              </label>
              <select
                value={selectedMachineFilter}
                onChange={(e) => onMachineFilterChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-semibold text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="ALL">Todas as Máquinas ({allMachinesList.length})</option>
                {allMachinesList.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Turno */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Visualizar apontamentos do turno:
              </label>
              <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                {[
                  { id: 'ALL', label: 'Todos' },
                  { id: 'shift1', label: '1º Turno' },
                  { id: 'shift2', label: '2º Turno' },
                  { id: 'shift3', label: '3º Turno' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onShiftFilterChange(item.id as any)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedShiftFilter === item.id
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Alternar Apenas com Apontamento */}
            <div>
              <button
                onClick={onToggleOnlyWithNotes}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                  onlyWithNotes
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-semibold">Apenas com Apontamento</span>
                </div>
                <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                  onlyWithNotes
                    ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                    : 'border-slate-600 bg-slate-800'
                }`}>
                  {onlyWithNotes && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            </div>

            {/* Contador de células */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Células encontradas:</span>
              <span className="font-mono font-bold text-cyan-400">
                {filteredMachinesCount} <span className="text-slate-500">/ {totalMachinesCount}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé do Menu com Botão de Ação */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-md shadow-cyan-500/20 text-center"
          >
            Ver Tabela com estes Filtros
          </button>
        </div>
      </div>
    </div>
  );
};
