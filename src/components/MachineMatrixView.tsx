import React, { useState, useMemo } from 'react';
import type { DailyProcessReport } from '../types';
import { Search, FileText } from 'lucide-react';

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
  onOpenMenu
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

  // Filtra as máquinas a serem exibidas
  // Filtra as máquinas a serem exibidas
  const displayedMachines = useMemo(() => {
    return machinesList.filter((m) => {
      if (selectedMachineFilter && selectedMachineFilter !== 'ALL' && m !== selectedMachineFilter) return false;
      const matchSearch = m.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

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
        <span className="text-slate-600 print:text-gray-400 select-none block text-center">
          —
        </span>
      );
    }

    return (
      <div 
        onClick={() => onOpenEditShift && onOpenEditShift(shiftKey)}
        className="font-sans text-xs whitespace-pre-wrap break-words text-slate-200 print:text-black font-normal leading-relaxed cursor-pointer"
        title="Clique para abrir edição deste turno"
      >
        {trimmed}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Estilos específicos para Impressão A4 Paisagem */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape !important;
            margin: 6mm 8mm !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-matrix-report,
          #printable-matrix-report * {
            visibility: visible !important;
          }
          #printable-matrix-report {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-compact-table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          .print-compact-table thead {
            display: table-header-group !important;
          }
          .print-compact-table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-compact-table th,
          .print-compact-table td {
            padding: 4px 6px !important;
            font-size: 8pt !important;
            line-height: 1.15 !important;
            border: 1px solid #64748b !important;
            color: #000000 !important;
            background: transparent !important;
            word-break: break-word !important;
          }
          .print-compact-table th:first-child,
          .print-compact-table td:first-child {
            width: 16% !important;
            font-weight: 800 !important;
          }
          .print-compact-table th {
            background-color: #e2e8f0 !important;
            font-weight: 800 !important;
            color: #0f172a !important;
            font-size: 8.5pt !important;
          }
        }
      `}</style>

      {/* ── BARRA DE FILTROS DA MATRIZ (COMPACTA NO CELULAR E COMPLETA NO DESKTOP) ── */}
      <div className="no-print">
        {/* Versão Celular: Barra Ultra Compacta de 1 linha */}
        <div className="sm:hidden flex items-center justify-between px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-[11px]">
          <div className="flex items-center gap-1.5 truncate text-slate-300">
            {(searchQuery.trim() || onlyWithNotes || selectedShiftFilter !== 'ALL') ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold truncate">
                Filtros Ativos
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium">Matriz Diária</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(searchQuery.trim() || onlyWithNotes || selectedShiftFilter !== 'ALL') ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  if (onlyWithNotes && toggleExternalOnlyNotes) toggleExternalOnlyNotes();
                  if (setExternalShiftFilter) setExternalShiftFilter('ALL');
                }}
                className="text-[10px] text-cyan-400 hover:text-white font-bold cursor-pointer"
              >
                ✕ Limpar
              </button>
            ) : null}
            {onOpenMenu && (
              <button
                onClick={onOpenMenu}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold border border-slate-700 cursor-pointer"
              >
                Filtros no Menu
              </button>
            )}
          </div>
        </div>

        {/* Versão Desktop: Barra Completa */}
        <div className="hidden sm:flex bg-slate-900 border border-slate-800 rounded-2xl p-2.5 items-center justify-between gap-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {/* Busca */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar célula..."
                className="px-2.5 py-1.5 pl-8 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-44"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>

            {/* Filtro das Máquinas */}
            {onMachineFilterChange && (
              <select
                value={selectedMachineFilter || 'ALL'}
                onChange={(e) => onMachineFilterChange(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
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
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">Todos os Turnos</option>
              <option value="shift1">1º Turno</option>
              <option value="shift2">2º Turno</option>
              <option value="shift3">3º Turno</option>
            </select>

            {/* Toggle Apenas com Apontamento */}
            <button
              onClick={() => setOnlyWithNotes()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                onlyWithNotes
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-950 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Apenas com Apontamento</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── TABELA MATRIZ DIÁRIA DE CÉLULAS X TURNOS (TELA + IMPRESSÃO) ── */}
      <div id="printable-matrix-report" className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Cabeçalho exclusivo para a impressão A4 */}
        <div className="hidden print:block p-3 border-b-2 border-black mb-2">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-base font-black uppercase tracking-wider text-black">
                Relatório Diário de Processo & Células
              </h1>
              <p className="text-[9pt] font-bold text-black mt-0.5">
                Data: {formattedDate} ({weekdayName})
                {selectedShiftFilter !== 'ALL' && ` • Filtro: ${selectedShiftFilter === 'shift1' ? '1º Turno' : selectedShiftFilter === 'shift2' ? '2º Turno' : '3º Turno'}`}
                {onlyWithNotes && ' • Apenas com apontamentos'}
              </p>
            </div>
            <div className="text-right text-[8pt] text-gray-700">
              Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Tabela de Dados */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse table-fixed print-compact-table">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-300 font-bold uppercase tracking-wider text-sm print:bg-gray-200 print:text-black">
                <th className="p-3 w-40 sm:w-48 shrink-0 font-bold text-white print:text-black text-sm uppercase tracking-wider">
                  Célula / Máquina
                </th>
                {(selectedShiftFilter === 'ALL' || selectedShiftFilter === 'shift1') && (
                  <th 
                    className="p-3 border-l border-slate-800 print:border-gray-400 font-bold text-slate-300 print:text-black text-sm uppercase tracking-wider"
                    title="1º Turno (05:00 - 14:18)"
                  >
                    1º Turno
                  </th>
                )}
                {(selectedShiftFilter === 'ALL' || selectedShiftFilter === 'shift2') && (
                  <th 
                    className="p-3 border-l border-slate-800 print:border-gray-400 font-bold text-slate-300 print:text-black text-sm uppercase tracking-wider"
                    title="2º Turno (14:18 - 23:25)"
                  >
                    2º Turno
                  </th>
                )}
                {(selectedShiftFilter === 'ALL' || selectedShiftFilter === 'shift3') && (
                  <th 
                    className="p-3 border-l border-slate-800 print:border-gray-400 font-bold text-slate-300 print:text-black text-sm uppercase tracking-wider"
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
                  <td colSpan={4} className="p-8 text-center text-slate-500 italic">
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
                      <td className="p-2.5 sm:p-3 font-bold text-white print:text-black font-mono text-sm tracking-wide">
                        {machine}
                      </td>

                      {(selectedShiftFilter === 'ALL' || selectedShiftFilter === 'shift1') && (
                        <td className="p-2.5 sm:p-3 border-l border-slate-800 print:border-gray-400">
                          {renderCellContent(t1, 'shift1')}
                        </td>
                      )}

                      {(selectedShiftFilter === 'ALL' || selectedShiftFilter === 'shift2') && (
                        <td className="p-2.5 sm:p-3 border-l border-slate-800 print:border-gray-400">
                          {renderCellContent(t2, 'shift2')}
                        </td>
                      )}

                      {(selectedShiftFilter === 'ALL' || selectedShiftFilter === 'shift3') && (
                        <td className="p-2.5 sm:p-3 border-l border-slate-800 print:border-gray-400">
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

        {/* Rodapé de Assinatura para Impressão */}
        <div className="hidden print:grid grid-cols-3 gap-6 text-center text-[8pt] p-4 mt-6 border-t border-gray-400">
          <div>
            <div className="border-b border-black mb-1 h-6" />
            <span className="font-bold">Visto 1º Turno</span>
          </div>
          <div>
            <div className="border-b border-black mb-1 h-6" />
            <span className="font-bold">Visto 2º Turno</span>
          </div>
          <div>
            <div className="border-b border-black mb-1 h-6" />
            <span className="font-bold">Visto 3º Turno / Supervisão</span>
          </div>
        </div>
      </div>
    </div>
  );
};
