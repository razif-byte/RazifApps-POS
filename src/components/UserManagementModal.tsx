import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, X, User as UserIcon, Lock, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { User, UserRole } from '../types';

interface UserManagementModalProps {
  currentUser: User;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  currentUser,
  onClose,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('cashier');
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          name: newName,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mencipta pengguna');

      setIsAdding(false);
      setNewUsername('');
      setNewName('');
      setNewPassword('');
      setNewRole('cashier');
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (id === currentUser.id) {
      alert('Anda tidak boleh memadam akaun anda sendiri yang sedang aktif!');
      return;
    }
    if (!confirm('Adakah anda pasti ingin memadam pengguna ini?')) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
      >
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-black text-white rounded-xl">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Pengurusan Pengguna & Peranan</h3>
              <p className="text-xs text-zinc-500">Kawalan akses pengguna (Admin, Manager, Cashier)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200/60 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* User List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Senarai Pengguna Berdaftar ({users.length})
              </h4>
              {!isAdding && (
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="px-3 py-1.5 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1 hover:bg-zinc-800"
                >
                  <Plus size={14} />
                  Tambah Pengguna
                </button>
              )}
            </div>

            {/* Add User Form Drawer */}
            {isAdding && (
              <form onSubmit={handleCreateUser} className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider">Cipta Akaun Baru</span>
                  <button type="button" onClick={() => setIsAdding(false)} className="text-xs text-zinc-400 hover:text-black">
                    Batal
                  </button>
                </div>
                {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Nama Penuh</label>
                    <input
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="cth: Siti Sarah"
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Nama Pengguna (ID)</label>
                    <input
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="cth: cashier2"
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Kata Laluan</label>
                    <input
                      required
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Peranan (Role)</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-semibold focus:outline-none"
                    >
                      <option value="cashier">Cashier (Jualan Sahaja)</option>
                      <option value="manager">Manager (Jualan, Stok & Laporan)</option>
                      <option value="admin">Admin (Akses Penuh)</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 shadow-md"
                >
                  Simpan Pengguna
                </button>
              </form>
            )}

            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="p-3.5 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200 flex items-center justify-center font-bold text-xs">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{u.name}</span>
                        <span className="text-xs font-mono text-zinc-400">(@{u.username})</span>
                      </div>
                      <span className={`inline-block px-2 py-0.5 mt-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        u.role === 'admin' 
                          ? 'bg-black text-white' 
                          : u.role === 'manager' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-zinc-200 text-zinc-700'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                  </div>
                  {u.id !== currentUser.id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Padam Pengguna"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center text-xs text-zinc-400">
          <span>RazifApps@Nasadef™</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-200 text-zinc-800 rounded-xl font-bold uppercase tracking-wider text-[11px] hover:bg-zinc-300"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
};
