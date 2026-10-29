import React, { useState, useMemo } from 'react';
import type { DailyProcessReport } from '../types';
import { SHIFTS_CONFIG } from '../shiftUtils';
import { Printer, Search, FileText, CheckCircle2, AlertTriangle, Wrench, Eye } from 'lucide-react';

interface MachineMatrixViewProps {
  report: DailyProcessReport;
  machinesList: string[];
  onOpenEditShift?: (shiftKey: 'shift1' | 'shift2' | 'shift3') => void;
}

export const MachineMatrixView: React.FC<MachineMatrixViewProps> = ({
  report,
  machinesList,
  onOpenEditShift
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyWithNotes, setOnlyWithNotes] = useState(false);
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<'ALL' | 'shift1' | 'shift2' | 'shift3'>('ALL');

  const [year, month, day] = report.date.split('-');
  const formattedDate = `${day}/${month}/${year}`;

  const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
  const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const weekdayName = weekdays[dateObj.getDay()];

  // Filtra as máquinas a serem exibidas
  const displayedMachines = useMemo(() => {
    return machinesList.filter((m) => {
      const matchSearch = m.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (onlyWithNotes) {
        const hasT1 = Boolean(report.shifts?.shift1?.machines?.[m]?.trim());
        const hasT2 = Boolean(report.shifts?.shift2?.machines?.[m]?.trim());
        const hasT3 = Boolean(report.shifts?.shift3?.machines?.[m]?.trim());

        if (selectedShiftFilter === 'shift1') return hasT1;
        if (selectedShiftFilter === 'shift2') return hasT2;
        if (selectedShiftFilter === 'shift3') return hasT3;
        return hasT1 || hasT2 || hasT3;
      }

      return true;
    });
  }, [machinesList, searchQuery, onlyWithNotes, selectedShiftFilter, report]);

  // Totalizadores de ocorrências
  const stats = useMemo(() => {
    let okCount = 0;
    let semBrutoCount = 0;
    let manutencaoCount = 0;
    let notasCount = 0;

    for (const sk of ['shift1', 'shift2', 'shift3'] as const) {
      const shiftMachines = report.shifts?.[sk]?.machines || {};
      for (const val of Object.values(shiftMachines)) {
        const t = (val || '').trim();
        if (t === 'OK') okCount++;
        else if (t === 'Sem Bruto') semBrutoCount++;
        else if (t === 'Manutenção') manutencaoCount++;
        else if (t) notasCount++;
      }
    }

    return { okCount, semBrutoCount, manutencaoCount, notasCount };
  }, [report]);

  const handlePrint = () => {
    window.print();
  };

  const renderCellContent = (val: string, shiftKey: 'shift1' | 'shift2' | 'shift3') => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      return (
        <span className="text-slate-600 print:text-gray-400 select-none block text-center">
          —
        </span>
      );
    }

    if (trimmed === 'OK') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 print:bg-gray-100 print:text-black print:border-gray-400">
          <CheckCircle2 className="w-3 h-3 text-emerald-400 print:text-black shrink-0" />
          <span>OK</span>
        </span>
      );
    }

    if (trimmed === 'Sem Bruto') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 print:bg-gray-100 print:text-black print:border-gray-400">
          <AlertTriangle className="w-3 h-3 text-amber-400 print:text-black shrink-0" />
          <span>Sem Bruto</span>
        </span>
      );
    }

    if (trimmed === 'Manutenção') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/15 text-red-300 border border-red-500/30 print:bg-gray-100 print:text-black print:border-gray-400">
          <Wrench className="w-3 h-3 text-red-400 print:text-black shrink-0" />
          <span>Manutenção</span>
        </span>
      );
    }

    return (
      <div 
        onClick={() => onOpenEditShift && onOpenEditShift(shiftKey)}
        className="font-sans text-xs whitespace-pre-wrap break-words text-slate-200 print:text-black font-medium leading-relaxed"
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

      {/* ── BARRA SUPERIOR DO MODO LEITURA (Filtros, Contadores e Impressão) ── */}
      <div className="no-print bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Painel por Máquinas & Leitura
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                  {formattedDate} ({weekdayName})
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Visão consolidada de todas as células preenchidas nos 3 turnos
              </p>
            </div>
          </div>

          {/* Badges de Totais */}
          <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-slate-800 text-xs">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-[11px]">
              {stats.okCount} OK
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 text-[11px]">
              {stats.semBrutoCount} Sem Bruto
            </span>
            <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 font-bold border border-red-500/20 text-[11px]">
              {stats.manutencaoCount} Manutenção
            </span>
            {stats.notasCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20 text-[11px]">
                {stats.notasCount} Ocorrências
              </span>
            )}
          </div>
        </div>

        {/* Controles de Busca, Filtro de Turno e Impressão */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Busca */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar célula..."
              className="px-2.5 py-1.5 pl-8 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-36 sm:w-44"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>

          {/* Filtro por Turno */}
          <select
            value={selectedShiftFilter}
            onChange={(e) => setSelectedShiftFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="ALL">Todos os Turnos</option>
            <option value="shift1">Apenas 1º Turno</option>
            <option value="shift2">Apenas 2º Turno</option>
            <option value="shift3">Apenas 3º Turno</option>
          </select>

          {/* Toggle Apenas com Ocorrências */}
          <button
            onClick={() => setOnlyWithNotes(!onlyWithNotes)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              onlyWithNotes
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-xs'
                : 'bg-slate-950 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Apenas com Apontamento</span>
            <span className="sm:hidden">Apontados</span>
          </button>

          {/* Botão de Impressão Idêntico */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
            title="Imprimir relatório diário em A4 Paisagem"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* ── QUADRO DE RESUMO DOS TURNOS (RESPONSÁVEIS E GERAIS) ── */}
      <div className="no-print grid grid-cols-1 md:grid-cols-3 gap-3">
        {(['shift1', 'shift2', 'shift3'] as const).map((sk) => {
          const cfg = SHIFTS_CONFIG[sk];
          const shiftData = report.shifts?.[sk];
          const hasDesc = Boolean(shiftData?.generalDescription?.trim());

          return (
            <div
              key={sk}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2 shadow-sm"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-xs text-white uppercase tracking-wider">
                  {cfg.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {cfg.startTime} - {cfg.endTime}
                </span>
              </div>

              <div className="text-xs">
                <span className="text-slate-400 font-medium">Responsável: </span>
                <span className="font-bold text-cyan-400">
                  {shiftData?.operatorName || 'Não informado'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] font-medium block mb-1">
                  Ocorrências Gerais:
                </span>
                <div className={`p-2 rounded-xl text-xs whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto custom-scrollbar ${
                  hasDesc 
                    ? 'bg-slate-950 border border-slate-800 text-slate-200'
                    : 'text-slate-500 italic'
                }`}>
                  {shiftData?.generalDescription || 'Nenhuma ocorrência geral anotada.'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── TABELA MATRIZ DIÁRIA DE CÉLULAS X TURNOS (TELA + IMPRESSÃO) ── */}
      <div id="printable-matrix-report" className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Cabeçalho exclusivo para a impressão A4 */}
        <div className="hidden print:block p-3 border-b-2 border-black mb-2">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-base font-black uppercase tracking-wider text-black">
                ATMS • Relatório Diário de Processo & Células
              </h1>
              <p className="text-[9pt] font-bold text-black mt-0.5">
                Data: {formattedDate} ({weekdayName})
                {selectedShiftFilter !== 'ALL' && ` • Filtro: ${SHIFTS_CONFIG[selectedShiftFilter].name}`}
                {onlyWithNotes && ' • Apenas com apontamentos'}
              </p>
            </div>
            <div className="text-right text-[8pt] text-gray-700">
              Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
            </div>
          </div>

          {/* Responsáveis na impressão */}
          <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-400 text-[8pt]">
            <div>
              <strong>1º Turno:</strong> {report.shifts?.shift1?.operatorName || '—'}
            </div>
            <div>
              <strong>2º Turno:</strong> {report.shifts?.shift2?.operatorName || '—'}
            </div>
            <div>
              <strong>3º Turno:</strong> {report.shifts?.shift3?.operatorName || '—'}
            </div>
          </div>
        </div>

        {/* Tabela de Dados */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse table-fixed print-compact-table">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px] print:bg-gray-200 print:text-black">
                <th className="p-3 w-36 sm:w-44 shrink-0 font-extrabold text-white print:text-black">
                  Célula / Máquina
                </th>
                {(selectedShiftFilter === 'ALL' || selectedShiftFilter === 'shift1') && (
                  <th className="p-3 border-l border-slate-800 print:border-gray-400">
                    1º Turno (05:00 - 14:18)
                  </th>
                )}
                {(selectedShiftFilter === 'ALL' || selectedShiftFilter === 'shift2') && (
                  <th className="p-3 border-l border-slate-800 print:border-gray-400">
                    2º Turno (14:18 - 23:25)
                  </th>
                )}
                {(selectedShiftFilter === 'ALL' || selectedShiftFilter === 'shift3') && (
                  <th className="p-3 border-l border-slate-800 print:border-gray-400">
                    3º Turno (23:25 - 05:00)
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
                      <td className="p-2.5 sm:p-3 font-bold text-white print:text-black font-mono">
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
