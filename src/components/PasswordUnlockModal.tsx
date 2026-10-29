import React, { useState, useEffect, useRef } from 'react';
import { Lock, KeyRound, X, AlertCircle } from 'lucide-react';
import { MASTER_PASSWORD } from '../shiftUtils';

interface PasswordUnlockModalProps {
  isOpen: boolean;
  shiftName: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const PasswordUnlockModal: React.FC<PasswordUnlockModalProps> = ({
  isOpen,
  shiftName,
  onSuccess,
  onClose
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === MASTER_PASSWORD) {
      setError(false);
      onSuccess();
      onClose();
    } else {
      setError(true);
      setPassword('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-sm p-6 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Liberar Edição</h3>
              <p className="text-[11px] text-slate-400">{shiftName} fora do horário</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Senha de Supervisor / Administrador:
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="Digite a senha..."
                className={`w-full px-3 py-2 pl-9 rounded-xl bg-slate-950 border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ${
                  error
                    ? 'border-red-500 focus:ring-red-500/30'
                    : 'border-slate-700 focus:border-amber-500 focus:ring-amber-500/20'
                }`}
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 mt-1.5 animate-fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Senha incorreta. Tente novamente.</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer shadow-lg shadow-amber-400/20"
            >
              Desbloquear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
