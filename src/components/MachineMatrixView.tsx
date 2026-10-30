import React, { useState, useMemo } from 'react';
import type { DailyProcessReport } from '../types';
import { Search, FileText, Printer } from 'lucide-react';
import { INITIAL_MACHINE_PARTS } from '../constants/machines';

interface MachineMatrixViewProps {
  report: DailyProcessReport;
  machinesList: string[];
  onOpenEditShift?: (shiftKey: 'shift1' | 'shift2' | 'shift3') => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onlyWithNotes?: boolean;
  onToggleOnlyWithNotes?: () => void;
  selectedShiftFilter?: 'ALL' | 'shift1' | 'shift2' | 'shift3';
  onShiftFilterChange?: (shift: 'ALL' | 'shift1' | 'shift2' | 'shift3') => void;
  selectedMachineFilter?: string;
  onMachineFilterChange?: (machine: string) => void;
  onOpenMenu?: () => void;
  onClearFilters?: () => void;
}

export const MachineMatrixView: React.FC<MachineMatrixViewProps> = ({
  report,
  machinesList,
  onOpenEditShift,
  searchQuery: externalSearch,
  onSearchChange: setExternalSearch,
  onlyWithNotes: externalOnlyNotes,
  onToggleOnlyWithNotes: toggleExternalOnlyNotes,
  selectedShiftFilter: externalShiftFilter,
  onShiftFilterChange: setExternalShiftFilter,
  selectedMachineFilter,
  onMachineFilterChange,
  onClearFilters
}) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [internalOnlyWithNotes, setInternalOnlyWithNotes] = useState(false);
  const [internalSelectedShiftFilter, setInternalSelectedShiftFilter] = useState<'ALL' | 'shift1' | 'shift2' | 'shift3'>('ALL');

  const searchQuery = externalSearch !== undefined ? externalSearch : internalSearchQuery;
  const setSearchQuery = setExternalSearch || setInternalSearchQuery;

  const onlyWithNotes = externalOnlyNotes !== undefined ? externalOnlyNotes : internalOnlyWithNotes;
  const setOnlyWithNotes = toggleExternalOnlyNotes || (() => setInternalOnlyWithNotes(!internalOnlyWithNotes));

  const selectedShiftFilter = externalShiftFilter !== undefined ? externalShiftFilter : internalSelectedShiftFilter;
  const setSelectedShiftFilter = setExternalShiftFilter || setInternalSelectedShiftFilter;

  const [year, month, day] = report.date.split('-');
  const formattedDate = `${day}/${month}/${year}`;

  const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
  const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const weekdayName = weekdays[dateObj.getDay()];

  // Obtém a peça da máquina (específica do turno filtrado, mais recente do dia ou herdada da linha de base)
  const getMachinePart = (machine: string, shiftKey?: 'shift1' | 'shift2' | 'shift3') => {
    if (shiftKey && report.shifts?.[shiftKey]?.machineParts?.[machine]) {
      return report.shifts[shiftKey].machineParts![machine];
    }
    if (report.machineParts?.[machine]) {
      return report.machineParts[machine];
    }
    return (
      report.shifts?.shift3?.machineParts?.[machine] ||
      report.shifts?.shift2?.machineParts?.[machine] ||
      report.shifts?.shift1?.machineParts?.[machine] ||
      INITIAL_MACHINE_PARTS[machine] ||
      ''
    );
  };

  // Filtra as máquinas a serem exibidas
  const displayedMachines = useMemo(() => {
    return machinesList.filter((m) => {
      if (selectedMachineFilter && selectedMachineFilter !== 'ALL' && m !== selectedMachineFilter) return false;
      
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchName = m.toLowerCase().includes(q);
        const part = getMachinePart(m).toLowerCase();
        const matchPart = part.includes(q);
        const t1 = (report.shifts?.shift1?.machines?.[m] || '').toLowerCase();
        const t2 = (report.shifts?.shift2?.machines?.[m] || '').toLowerCase();
        const t3 = (report.shifts?.shift3?.machines?.[m] || '').toLowerCase();
        const matchNotes = t1.includes(q) || t2.includes(q) || t3.includes(q);
        if (!matchName && !matchNotes && !matchPart) return false;
      }

      if (onlyWithNotes) {
        const isRealNote = (v?: string) => {
          const t = (v || '').trim();
          return Boolean(t && t.toUpperCase() !== 'OK');
        };

        const hasT1 = isRealNote(report.shifts?.shift1?.machines?.[m]);
        const hasT2 = isRealNote(report.shifts?.shift2?.machines?.[m]);
        const hasT3 = isRealNote(report.shifts?.shift3?.machines?.[m]);

        if (selectedShiftFilter === 'shift1') return hasT1;
        if (selectedShiftFilter === 'shift2') return hasT2;
        if (selectedShiftFilter === 'shift3') return hasT3;
        return hasT1 || hasT2 || hasT3;
      }

      return true;
    });
  }, [machinesList, searchQuery, onlyWithNotes, selectedShiftFilter, selectedMachineFilter, report]);

  const renderCellContent = (val: string, shiftKey: 'shift1' | 'shift2' | 'shift3') => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      return (
        <span className="text-slate-600 print:text-gray-400 select-none block text-center text-xs">
          —
        </span>
      );
    }

    return (
      <div 
        onClick={() => onOpenEditShift && onOpenEditShift(shiftKey)}
        className="font-sans text-[11px] whitespace-pre-wrap break-words text-slate-200 print:text-black font-normal leading-tight cursor-pointer uppercase"
        title="Clique para abrir edição deste turno"
      >
        {trimmed.toUpperCase()}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── BARRA DE FILTROS DA MATRIZ (COMPACTA NO CELULAR E COMPLETA NO DESKTOP) ── */}
      {(() => {
        const hasActiveFilters = Boolean(
          searchQuery.trim() ||
          onlyWithNotes ||
          selectedShiftFilter !== 'ALL' ||
          (selectedMachineFilter && selectedMachineFilter !== 'ALL')
        );

        const handleResetAllFilters = () => {
          if (onClearFilters) {
            onClearFilters();
          } else {
            setSearchQuery('');
            if (onlyWithNotes && toggleExternalOnlyNotes) toggleExternalOnlyNotes();
            if (setExternalShiftFilter) setExternalShiftFilter('ALL');
            if (onMachineFilterChange) onMachineFilterChange('ALL');
          }
        };

        return (
          <div className="no-print">
            {/* Versão Celular: Exibe apenas se houver filtros ativos */}
            {hasActiveFilters ? (
              <div className="sm:hidden flex items-center justify-between px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-[11px] mb-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold truncate">
                  Filtros Ativos
                  {selectedMachineFilter && selectedMachineFilter !== 'ALL' && ` [${selectedMachineFilter}]`}
                </span>
                <button
                  onClick={handleResetAllFilters}
                  className="text-[10px] text-red-400 hover:text-white cursor-pointer"
                >
                  ✕ Limpar Filtros
                </button>
              </div>
            ) : null}

            {/* Versão Desktop: Barra Completa */}
            <div className="hidden sm:flex bg-slate-900 border border-slate-800 rounded-2xl p-2.5 items-center justify-between gap-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                {/* Busca */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar célula ou peça..."
                    className="px-2.5 py-1.5 pl-8 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 w-44 uppercase"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                </div>

                {/* Filtro das Máquinas */}
                {onMachineFilterChange && (
                  <select
                    value={selectedMachineFilter || 'ALL'}
                    onChange={(e) => onMachineFilterChange(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-red-500 cursor-pointer"
                    title="Filtrar máquina específica"
                  >
                    <option value="ALL">Todas as Máquinas</option>
                    {machinesList.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}

                {/* Filtro por Turno */}
                <select
                  value={selectedShiftFilter}
                  onChange={(e) => setSelectedShiftFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="ALL">Todos os Turnos</option>
                  <option value="shift1">1º Turno</option>
                  <option value="shift2">2º Turno</option>
                  <option value="shift3">3º Turno</option>
                </select>

                {/* Toggle Apenas com Apontamento - Fundo igual ao do filtro de máquina e sem negrito */}
                <button
                  onClick={() => setOnlyWithNotes()}
                  className={`filter-match-select flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border transition-colors cursor-pointer shrink-0 bg-slate-950 border-slate-700 ${
                    onlyWithNotes
                      ? 'active-filter border-red-500/70 text-red-500 dark:text-red-400'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Exibir apenas células com anotações ou ocorrências"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Apenas com Apontamento</span>
                </button>

                {/* Botão Limpar Filtros no Desktop se houver filtro ativo */}
                {hasActiveFilters && (
                  <button
                    onClick={handleResetAllFilters}
                    className="filter-match-select flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-red-500/50 text-red-500 dark:text-red-400 text-xs cursor-pointer transition-colors shrink-0"
                    title="Limpar todos os filtros da tabela"
                  >
                    <span>✕ Limpar Filtros</span>
                  </button>
                )}
              </div>

              {/* Botão Imprimir / Salvar PDF (Ajustado para 1 página) */}
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-500 text-xs font-semibold cursor-pointer transition-all shadow-sm shrink-0 ml-auto"
                title="Imprimir relatório ou Salvar como PDF formatado em 1 página A4"
              >
                <Printer className="w-3.5 h-3.5 text-red-400" />
                <span>Imprimir / PDF</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── TABELA MATRIZ DIÁRIA DE CÉLULAS X TURNOS (TELA + IMPRESSÃO) ── */}
      <div id="printable-matrix-report" className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Cabeçalho exclusivo para a impressão A4 (Reduzido e compacto) */}
        <div className="print-header-banner hidden p-2 border-b border-black mb-1.5">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-sm font-black uppercase tracking-wider text-black">
                Relatório Diário de Processo & Células
              </h1>
              <p className="text-[8pt] font-bold text-black mt-0.5">
                Data: {formattedDate} ({weekdayName})
                {selectedShiftFilter !== 'ALL' && ` • Filtro: ${selectedShiftFilter === 'shift1' ? '1º Turno' : selectedShiftFilter === 'shift2' ? '2º Turno' : '3º Turno'}`}
                {onlyWithNotes && ' • Apenas com apontamentos'}
              </p>
            </div>
            <div className="text-right text-[7.5pt] text-gray-700">
              Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Tabela de Dados */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse table-fixed print-compact-table">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-300 font-bold uppercase tracking-wider text-xs print:bg-gray-200 print:text-black">
                <th className="py-2 px-2.5 w-44 sm:w-52 shrink-0 font-bold text-white print:text-black text-xs uppercase tracking-wider">
                  Célula / Peça
                </th>
                {(selectedShiftFilter === 'ALL' || selectedShiftFilter === 'shift1') && (
                  <th 
                    className="py-2 px-2 border-l border-slate-800 print:border-gray-400 font-bold text-slate-300 print:text-black text-xs uppercase tracking-wider text-center"
                    title="1º Turno (05:00 - 14:18)"
                  >
                    1º Turno
                  </th>
                )}
                {(selectedShiftFilter === 'ALL' || selectedShiftFilter === 'shift2') && (
                  <th 
                    className="py-2 px-2 border-l border-slate-800 print:border-gray-400 font-bold text-slate-300 print:text-black text-xs uppercase tracking-wider text-center"
                    title="2º Turno (14:18 - 23:25)"
                  >
                    2º Turno
                  </th>
                )}
                {(selectedShiftFilter === 'ALL' || selectedShiftFilter === 'shift3') && (
                  <th 
                    className="py-2 px-2 border-l border-slate-800 print:border-gray-400 font-bold text-slate-300 print:text-black text-xs uppercase tracking-wider text-center"
                    title="3º Turno (23:25 - 05:00)"
                  >
                    3º Turno
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 print:divide-gray-400">
              {displayedMachines.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 italic text-xs">
                    Nenhuma célula com dados para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                displayedMachines.map((machine, idx) => {
                  const t1 = report.shifts?.shift1?.machines?.[machine] || '';
                  const t2 = report.shifts?.shift2?.machines?.[machine] || '';
                  const t3 = report.shifts?.shift3?.machines?.[machine] || '';

                  return (
                    <tr
                      key={machine}
                      className={`transition-colors ${
                        idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/90'
                      } hover:bg-slate-800/60 print:bg-transparent`}
                    >
                      {/* Célula e Peça no Modo Leitura */}
                      <td className="py-1.5 px-2.5 font-mono print:text-black">
                        <div className="flex flex-col">
                          <span className="font-bold text-white print:text-black text-xs tracking-wide">
                            {machine}
                          </span>
                          {(() => {
                            const part = getMachinePart(machine, selectedShiftFilter !== 'ALL' ? selectedShiftFilter : undefined);
                            if (!part) return null;
                            return (
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-amber-500/15 dark:bg-amber-400/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 print:text-black print:bg-transparent print:border-none print:p-0 font-mono font-bold text-[10px] w-fit">
                                {part}
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      {(selectedShiftFilter === 'ALL' || selectedShiftFilter === 'shift1') && (
                        <td className="py-1.5 px-2 border-l border-slate-800 print:border-gray-400">
                          {renderCellContent(t1, 'shift1')}
                        </td>
                      )}

                      {(selectedShiftFilter === 'ALL' || selectedShiftFilter === 'shift2') && (
                        <td className="py-1.5 px-2 border-l border-slate-800 print:border-gray-400">
                          {renderCellContent(t2, 'shift2')}
                        </td>
                      )}

                      {(selectedShiftFilter === 'ALL' || selectedShiftFilter === 'shift3') && (
                        <td className="py-1.5 px-2 border-l border-slate-800 print:border-gray-400">
                          {renderCellContent(t3, 'shift3')}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé de Assinatura para Impressão (Compacto) */}
        <div className="hidden print:grid grid-cols-3 gap-6 text-center text-[7pt] p-2 mt-2 border-t border-gray-400">
          <div>
            <div className="border-b border-black mb-0.5 h-4" />
            <span className="font-bold">Visto 1º Turno</span>
          </div>
          <div>
            <div className="border-b border-black mb-0.5 h-4" />
            <span className="font-bold">Visto 2º Turno</span>
          </div>
          <div>
            <div className="border-b border-black mb-0.5 h-4" />
            <span className="font-bold">Visto 3º Turno / Supervisão</span>
          </div>
        </div>
      </div>
    </div>
  );
};
