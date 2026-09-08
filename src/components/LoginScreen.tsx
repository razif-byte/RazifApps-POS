import React, { useState } from 'react';
import { ShoppingCart, ShieldCheck, Lock, User as UserIcon, AlertCircle, KeyRound, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent, customUser?: string, customPass?: string) => {
    if (e) e.preventDefault();
    const u = customUser || username;
    const p = customPass || password;

    if (!u || !p) {
      setError('Sila masukkan nama pengguna dan kata laluan');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal log masuk');
      }
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Ralat sambungan pelayan');
    } finally {
      setLoading(false);
    }
  };

  const fillQuick = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    handleLogin(undefined, u, p);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-100 via-zinc-50 to-zinc-200 flex flex-col justify-center items-center p-4 relative font-sans text-zinc-900">
      {/* Watermark top right */}
      <div className="absolute top-4 right-6 text-[11px] font-mono tracking-wider text-zinc-400 select-none">
        RazifApps@Nasadef™
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white border border-zinc-200 shadow-2xl rounded-3xl p-8 md:p-10 relative overflow-hidden"
      >
        {/* Subtle accent header line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-black" />

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-lg shadow-black/20">
            <ShoppingCart size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight">RazifApps POS Suite</h1>
            <p className="text-xs text-zinc-500 font-medium">Log Masuk Sistem Peruncitan & Pemantauan</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 text-xs font-medium">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
              <UserIcon size={13} />
              Nama Pengguna
            </label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="cth: admin, manager, atau cashier"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 transition-all text-sm font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
              <Lock size={13} />
              Kata Laluan
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 transition-all text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-black/20 hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            <KeyRound size={15} />
            {loading ? 'Mengesahkan...' : 'Log Masuk'}
          </button>
        </form>

        {/* Quick Demo Login shortcuts */}
        <div className="mt-8 pt-6 border-t border-zinc-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
            <Sparkles size={12} className="text-amber-500" />
            Pilih Akaun Pantas (Demo / Ujian):
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillQuick('admin', 'admin123')}
              className="p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-left transition-colors group"
            >
              <span className="block text-[11px] font-bold text-zinc-900 group-hover:text-black">Admin</span>
              <span className="block text-[9px] text-zinc-400 truncate">Akses Penuh</span>
            </button>
            <button
              type="button"
              onClick={() => fillQuick('manager', 'manager123')}
              className="p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-left transition-colors group"
            >
              <span className="block text-[11px] font-bold text-zinc-900 group-hover:text-black">Manager</span>
              <span className="block text-[9px] text-zinc-400 truncate">Stok & Laporan</span>
            </button>
            <button
              type="button"
              onClick={() => fillQuick('cashier', 'cashier123')}
              className="p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-left transition-colors group"
            >
              <span className="block text-[11px] font-bold text-zinc-900 group-hover:text-black">Cashier</span>
              <span className="block text-[9px] text-zinc-400 truncate">Jualan Sahaja</span>
            </button>
          </div>
        </div>

        {/* Security / Privacy notice */}
        <div className="mt-6 text-center text-[10px] text-zinc-400 flex items-center justify-center gap-1.5">
          <ShieldCheck size={13} className="text-emerald-600" />
          <span>Pengesahan Kata Laluan Berenkripsi SHA-256 & SQLite Tempatan</span>
        </div>
      </motion.div>

      {/* Footer watermark */}
      <footer className="mt-8 text-center text-xs text-zinc-400">
        <p className="font-semibold text-zinc-600">RazifApps POS & Monitor Suite @ Nasadef™</p>
        <p className="text-[11px] mt-0.5">Semua data disimpan di pangkalan data peranti anda secara selamat.</p>
      </footer>
    </div>
  );
};
