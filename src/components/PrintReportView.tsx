import React from 'react';
import type { DailyProcessReport } from '../types';
import { SHIFTS_CONFIG } from '../shiftUtils';

interface PrintReportViewProps {
  report: DailyProcessReport;
  machinesList: string[];
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({ report, machinesList }) => {
  const [year, month, day] = report.date.split('-');
  const formattedDate = `${day}/${month}/${year}`;

  const shifts = [
    { key: 'shift1' as const, name: SHIFTS_CONFIG.shift1.name, time: SHIFTS_CONFIG.shift1.description, data: report.shifts?.shift1 },
    { key: 'shift2' as const, name: SHIFTS_CONFIG.shift2.name, time: SHIFTS_CONFIG.shift2.description, data: report.shifts?.shift2 },
    { key: 'shift3' as const, name: SHIFTS_CONFIG.shift3.name, time: SHIFTS_CONFIG.shift3.description, data: report.shifts?.shift3 }
  ];

  return (
    <div className="hidden print:block text-black p-4 max-w-4xl mx-auto font-sans text-xs">
      {/* Cabeçalho do Relatório */}
      <div className="border-b-2 border-black pb-3 mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-tight">Diário de Bordo & Processo</h1>
          <p className="text-xs text-gray-700">Relatório Diário de Turnos e Ocorrências das Células</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold">Data: {formattedDate}</div>
          <div className="text-[10px] text-gray-600">Emitido em: {new Date().toLocaleTimeString()}</div>
        </div>
      </div>

      {/* Seções de Cada Turno */}
      <div className="space-y-4">
        {shifts.map((s) => {
          const shiftData = s.data;
          const machinesWithNotes = machinesList.filter((m) => {
            const val = (shiftData?.machines?.[m] || '').trim();
            return Boolean(val);
          });

          return (
            <div key={s.key} className="border border-gray-400 rounded p-3 break-inside-avoid">
              <div className="flex justify-between items-center border-b border-gray-300 pb-1 mb-2 bg-gray-100 px-2 py-1">
                <span className="font-bold text-sm uppercase">{s.name} ({s.time})</span>
                <span className="text-xs">
                  <span className="font-semibold">Responsável:</span> {shiftData?.operatorName || '—'}
                </span>
              </div>

              {/* Descrição Geral */}
              {shiftData?.generalDescription && (
                <div className="mb-2.5 p-2 bg-gray-50 border border-gray-200 rounded">
                  <span className="font-bold block text-[11px] mb-0.5 uppercase">Ocorrências Gerais:</span>
                  <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-gray-800">
                    {shiftData.generalDescription}
                  </p>
                </div>
              )}

              {/* Ocorrências por Máquina */}
              <div>
                <span className="font-bold block text-[11px] mb-1 uppercase">Apontamentos por Máquina:</span>
                {machinesWithNotes.length === 0 ? (
                  <p className="text-[10px] italic text-gray-500">Nenhum apontamento específico registrado neste turno.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {machinesWithNotes.map((m) => {
                      const text = shiftData?.machines?.[m] || '';
                      return (
                        <div key={m} className="border border-gray-300 p-1.5 rounded text-[10px]">
                          <span className="font-bold block text-gray-900 border-b border-gray-200 pb-0.5 mb-1">
                            {m}
                          </span>
                          <span className="whitespace-pre-wrap block text-gray-700">{text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rodapé de Assinatura */}
      <div className="mt-8 pt-4 border-t border-gray-400 grid grid-cols-3 gap-6 text-center text-[10px]">
        <div>
          <div className="border-b border-black mb-1 h-8" />
          <span>Visto 1º Turno</span>
        </div>
        <div>
          <div className="border-b border-black mb-1 h-8" />
          <span>Visto 2º Turno</span>
        </div>
        <div>
          <div className="border-b border-black mb-1 h-8" />
          <span>Visto 3º Turno / Supervisão</span>
        </div>
      </div>
    </div>
  );
};
