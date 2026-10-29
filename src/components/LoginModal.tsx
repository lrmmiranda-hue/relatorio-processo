import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth, getAllUserProfilesFirebase } from '../firebase';
import type { UserProfile } from '../types';
import { X, Mail, Lock, User as UserIcon, AlertCircle, Loader2 } from 'lucide-react';
import logo1Img from '../assets/logo1.png';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserIdentified: (profile: UserProfile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onUserIdentified }) => {
  const [loginMode, setLoginMode] = useState<'username' | 'admin'>('username');
  
  // Modo Usuário
  const [usernameInput, setUsernameInput] = useState('');
  
  // Modo Administrador
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Login por Usuário cadastrado no ATMS (idêntico ao sistema principal)
  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = usernameInput.trim().toLowerCase().replace(/\s+/g, '.');
    if (!cleanUser) {
      setErrorMsg('Informe o seu usuário cadastrado.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const allUsers = await getAllUserProfilesFirebase();
      const found = allUsers.find((u) => {
        const uname = (u.username || '').trim().toLowerCase().replace(/\s+/g, '.');
        const uemail = (u.email || '').trim().toLowerCase().split('@')[0].replace(/\s+/g, '.');
        const ufullName = (u.name || '').trim().toLowerCase().replace(/\s+/g, '.');
        const ufullEmail = (u.email || '').trim().toLowerCase();

        return (
          uname === cleanUser ||
          uemail === cleanUser ||
          ufullName === cleanUser ||
          ufullEmail === cleanUser ||
          (cleanUser === 'facilitadores.usinagem' && (uname.includes('facilitadores') || uemail.includes('facilitadores')))
        );
      });

      if (!found) {
        setErrorMsg(`Usuário "${usernameInput}" não encontrado no sistema. Verifique o login cadastrado.`);
        return;
      }

      if (found.role === 'PENDING') {
        setErrorMsg(`O usuário "${found.username || usernameInput}" está com acesso pendente ou bloqueado.`);
        return;
      }

      // Salva sessão local do usuário
      localStorage.setItem('relatorio_processo_active_user', JSON.stringify(found));
      onUserIdentified(found);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao consultar usuários no banco: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Login por Administrador (E-mail e Senha)
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Preencha seu e-mail e senha.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setErrorMsg('E-mail ou senha incorretos.');
      } else {
        setErrorMsg(err.message || 'Erro ao realizar login.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Login com Google
  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Falha ao autenticar com o Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-sm p-6 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl text-slate-100">
        {/* Cabeçalho do Modal com Logo ATMS */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <img src={logo1Img} alt="ATMS" className="h-8 w-auto object-contain" />
            <div>
              <h3 className="text-sm font-bold text-white">Identificação no Sistema</h3>
              <p className="text-[11px] text-slate-400">Acesse com seu usuário ou administrador</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Abas: Usuário vs Administrador */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mt-4 mb-4">
          <button
            type="button"
            onClick={() => {
              setLoginMode('username');
              setErrorMsg('');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              loginMode === 'username'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Usuário (Operador)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('admin');
              setErrorMsg('');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              loginMode === 'admin'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Administrador</span>
          </button>
        </div>

        {/* Formulário Modo Usuário */}
        {loginMode === 'username' ? (
          <form onSubmit={handleUsernameLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Usuário Cadastrado
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Ex: facilitadores.usinagem"
                  className="w-full px-3 py-2 pl-9 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-['Inter',sans-serif]"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Utilize o mesmo login já cadastrado no sistema ATMS.
              </p>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors cursor-pointer shadow-lg shadow-cyan-400/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar no Sistema'}
            </button>
          </form>
        ) : (
          /* Formulário Modo Administrador */
          <form onSubmit={handleEmailLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">E-mail do Administrador</label>
              <div className="relative">
                <input
                  type="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@exemplo.com"
                  className="w-full px-3 py-2 pl-9 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Senha</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pl-9 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-colors cursor-pointer shadow-lg shadow-cyan-400/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar como Administrador'}
            </button>

            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold">
                <span className="bg-slate-900 px-2 text-slate-500">ou</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Entrar com Google</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
