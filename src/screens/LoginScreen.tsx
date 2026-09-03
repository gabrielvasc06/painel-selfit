import { useState } from 'react';
import { Eye, EyeOff, Lock, User, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('selfit2026');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setError('Informe seu usuário corporativo no formato nome.sobrenome.');
      return;
    }

    setLoading(true);

    // Formata login nome.sobrenome -> nome.sobrenome@selfit.com.br
    const email = cleanUsername.includes('@')
      ? cleanUsername
      : `${cleanUsername}@selfit.com.br`;

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Credenciais inválidas. Verifique seu usuário e senha.');
      setLoading(false);
      return;
    }

    setLoading(false);
    onLogin();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      {/* Background Decorativo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-red-800/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-600/30">
              <span className="font-black text-2xl tracking-tight text-white">SF</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">SELFIT</h1>
            <div className="mt-2 flex items-center gap-2">
              <span className="h-px w-8 bg-red-500/40" />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Sistema de Gestão e Inventário
                
              </span>
              <span className="h-px w-8 bg-red-500/40" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-sm font-medium text-slate-300">
                Usuário Corporativo
              </label>
              <div className="group relative">
                <User className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-red-500" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="nome.sobrenome"
                  autoComplete="username"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-3 pl-11 pr-4 text-slate-100 placeholder:text-slate-600 transition-all focus:border-red-500 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Senha
              </label>
              <div className="group relative">
                <Lock className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-red-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-3 pl-11 pr-12 text-slate-100 placeholder:text-slate-600 transition-all focus:border-red-500 focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition-colors hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-red-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-red-600/30 transition-all hover:bg-red-500 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Autenticando...
                </span>
              ) : (
                'Entrar no Sistema'
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-slate-950/40 p-3 border border-slate-800/60">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <p className="text-xs text-slate-400">Ambiente Seguro &bull; Selfit Holding 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}