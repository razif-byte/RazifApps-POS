import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Award, 
  ShoppingBag, 
  Phone, 
  Mail, 
  Calendar, 
  X, 
  Receipt, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer, Sale } from '../types';
import { format } from 'date-fns';

export const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSaveCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const method = editingCustomer ? 'PUT' : 'POST';
    const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingCustomer(null);
        fetchCustomers();
      } else {
        const err = await res.json();
        alert(err.error || 'Ralat menyimpan pelanggan');
      }
    } catch (err) {
      console.error('Error saving customer:', err);
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm('Adakah anda pasti ingin memadam rekod pelanggan ini?')) return;
    try {
      await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      fetchCustomers();
      if (viewingCustomer?.id === id) setViewingCustomer(null);
    } catch (err) {
      console.error('Error deleting customer:', err);
    }
  };

  const handleViewCustomer = async (c: Customer) => {
    setViewingCustomer(c);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/customers/${c.id}`);
      const data = await res.json();
      setCustomerSales(data.transactions || []);
    } catch (err) {
      console.error('Error fetching customer history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery)) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Cari nama, nombor telefon atau emel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 transition-all text-sm"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="text-xs text-zinc-400 font-mono hidden sm:block">
            RazifApps@Nasadef™
          </div>
          <button
            onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 text-xs font-bold uppercase tracking-wider"
          >
            <Plus size={16} />
            Daftar Pelanggan
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Jumlah Ahli</p>
              <h3 className="text-3xl font-light mt-1">{customers.length}</h3>
            </div>
            <div className="p-2.5 bg-zinc-100 rounded-xl text-zinc-800">
              <Users size={22} />
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Mata Kesetiaan Beredar</p>
              <h3 className="text-3xl font-light text-amber-600 mt-1">
                {customers.reduce((acc, c) => acc + (c.points || 0), 0)} pts
              </h3>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Award size={22} />
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Kadar Ganjaran</p>
              <p className="text-sm font-semibold text-zinc-700 mt-1">RM 1.00 = 1 Mata</p>
              <p className="text-[11px] text-zinc-400">10 Mata = Diskaun RM 1.00</p>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Sparkles size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Customers Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nama Pelanggan</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">No. Telefon</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Emel</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">Mata Kesetiaan</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center">Jumlah Pembelian</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50/70 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center font-bold text-xs text-zinc-700">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-sm text-zinc-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-zinc-600">
                    {c.phone || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-500">
                    {c.email || '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200/60 rounded-full font-bold text-xs">
                      <Award size={12} className="text-amber-500" />
                      {c.points} pts
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm">
                    <span className="font-bold text-zinc-800">{c.total_purchases || 0}</span>
                    <span className="text-xs text-zinc-400 ml-1">(RM {(c.total_spent || 0).toFixed(2)})</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => handleViewCustomer(c)}
                        title="Lihat Sejarah Transaksi"
                        className="px-2.5 py-1.5 text-xs font-bold text-zinc-600 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors flex items-center gap-1 border border-zinc-200"
                      >
                        <Receipt size={13} />
                        Sejarah
                      </button>
                      <button
                        onClick={() => { setEditingCustomer(c); setIsModalOpen(true); }}
                        title="Edit Maklumat"
                        className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(c.id)}
                        title="Hapus"
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-zinc-400 text-sm">
                    Tiada rekod pelanggan dijumpai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="text-lg font-bold">
                {editingCustomer ? 'Kemaskini Pelanggan' : 'Daftar Pelanggan Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nama Penuh</label>
                <input
                  name="name"
                  defaultValue={editingCustomer?.name}
                  required
                  placeholder="cth: Ahmad Razif"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 text-sm font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">No. Telefon</label>
                <input
                  name="phone"
                  defaultValue={editingCustomer?.phone || ''}
                  placeholder="cth: 012-3456789"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Alamat Emel</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={editingCustomer?.email || ''}
                  placeholder="cth: razif@example.com"
                  className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 text-sm"
                />
              </div>

              {editingCustomer && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Mata Kesetiaan</label>
                  <input
                    name="points"
                    type="number"
                    defaultValue={editingCustomer.points}
                    className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 text-sm font-mono"
                  />
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-zinc-200 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-zinc-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-black/20 hover:bg-zinc-800"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Customer Purchase History Modal */}
      {viewingCustomer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-black text-white rounded-2xl flex items-center justify-center font-bold text-base">
                  {viewingCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{viewingCustomer.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    {viewingCustomer.phone && <span>{viewingCustomer.phone}</span>}
                    {viewingCustomer.email && <span>• {viewingCustomer.email}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Baki Mata</p>
                  <p className="text-lg font-bold text-amber-600">{viewingCustomer.points} pts</p>
                </div>
                <button
                  onClick={() => setViewingCustomer(null)}
                  className="p-2 hover:bg-zinc-200/60 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                <Receipt size={14} />
                Sejarah Transaksi Pembelian ({customerSales.length})
              </h4>

              {loadingHistory ? (
                <div className="py-12 text-center text-zinc-400 text-sm">Memuatkan sejarah transaksi...</div>
              ) : customerSales.length > 0 ? (
                <div className="space-y-3">
                  {customerSales.map((sale) => (
                    <div key={sale.id} className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">Resit #{sale.id}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-zinc-200/80 rounded-md font-bold uppercase tracking-wider">
                              {sale.payment_method}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {format(new Date(sale.timestamp), 'dd MMM yyyy, hh:mm a')} • Juruwang: {sale.cashier_username || 'Kakitangan'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold">RM {sale.total_amount.toFixed(2)}</p>
                          {sale.discount > 0 && (
                            <p className="text-[11px] text-rose-500 font-medium">Diskaun: RM {sale.discount.toFixed(2)}</p>
                          )}
                        </div>
                      </div>

                      {/* Items breakdown */}
                      <div className="pt-3 border-t border-zinc-200/60 space-y-1">
                        {(sale.items || []).map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-zinc-600">
                            <span>{item.name || 'Produk'} × {item.quantity}</span>
                            <span className="font-medium">RM {(item.price_at_sale * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Points earned / redeemed */}
                      {(sale.points_earned || sale.points_redeemed) ? (
                        <div className="mt-3 pt-2 border-t border-dashed border-zinc-200 flex justify-between text-[11px] text-amber-700 font-medium">
                          <span>
                            {sale.points_redeemed ? `Tebus: -${sale.points_redeemed} pts` : ''}
                          </span>
                          <span>
                            {sale.points_earned ? `Dapat: +${sale.points_earned} pts` : ''}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-zinc-400 text-sm">
                  Pelanggan ini belum mempunyai sebarang rekod transaksi pembelian.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center text-xs text-zinc-400">
              <span>RazifApps@Nasadef™</span>
              <button
                onClick={() => setViewingCustomer(null)}
                className="px-4 py-2 bg-zinc-200 text-zinc-800 rounded-xl font-bold uppercase tracking-wider text-[11px] hover:bg-zinc-300"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
