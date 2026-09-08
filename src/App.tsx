import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  AlertTriangle, 
  CheckCircle2,
  Printer, 
  CreditCard, 
  Banknote, 
  X, 
  ChevronRight, 
  ChevronLeft,
  Users,
  LogOut,
  Shield,
  Award,
  Sparkles,
  Barcode as BarcodeIcon,
  Tag,
  UserCheck
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Product, Category, CartItem, SaleReport, TopProduct, User, Customer, UserRole, ConnectedPrinter } from './types';
import { LoginScreen } from './components/LoginScreen';
import { CustomerManagement } from './components/CustomerManagement';
import { BarcodeGeneratorModal } from './components/BarcodeGeneratorModal';
import { UserManagementModal } from './components/UserManagementModal';
import { ReceiptModal } from './components/ReceiptModal';
import { PrinterSettingsModal } from './components/PrinterSettingsModal';

// --- Shared UI Components ---
const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  badge,
  onClick 
}: { 
  icon: any; 
  label: string; 
  active: boolean; 
  badge?: string;
  onClick: () => void; 
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center justify-between w-full px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl",
      active 
        ? "bg-black text-white shadow-lg shadow-black/15" 
        : "text-zinc-500 hover:bg-zinc-100 hover:text-black"
    )}
  >
    <div className="flex items-center gap-3">
      <Icon size={19} />
      <span>{label}</span>
    </div>
    {badge && (
      <span className={cn(
        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
        active ? "bg-zinc-800 text-zinc-300" : "bg-zinc-200 text-zinc-700"
      )}>
        {badge}
      </span>
    )}
  </button>
);

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'warning' | 'danger' }) => {
  const variants = {
    default: "bg-zinc-100 text-zinc-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-rose-100 text-rose-700"
  };
  return (
    <span className={cn("px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full", variants[variant])}>
      {children}
    </span>
  );
};

export default function App() {
  // Current logged in user (null triggers login screen)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('pos_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'pos' | 'reports' | 'customers'>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBarcodeGenOpen, setIsBarcodeGenOpen] = useState(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Reports
  const [reports, setReports] = useState<SaleReport[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  
  // POS State
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'E-Wallet'>('Cash');
  const [discount, setDiscount] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [pointsRedeemed, setPointsRedeemed] = useState(0);
  const [lastReceipt, setLastReceipt] = useState<any | null>(null);

  // Printers Management State
  const [printers, setPrinters] = useState<ConnectedPrinter[]>(() => {
    const saved = localStorage.getItem('pos_printers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Error reading saved printers:", e);
      }
    }
    return [
      {
        id: 'printer-system-default',
        name: 'Pencetak Sistem (OS Spooler)',
        type: 'system',
        address: 'Pemacu Cetakan Sistem Lalai',
        paperWidth: '80mm',
        isDefault: true,
        status: 'connected',
        autoCut: true,
        openDrawer: true,
        model: 'Universal Document / POS Spooler',
        addedAt: new Date().toISOString(),
      },
      {
        id: 'printer-usb-escpos',
        name: 'Xprinter XP-58IIH (USB ESC/POS)',
        type: 'usb',
        address: 'USB001 (0416:5011)',
        paperWidth: '58mm',
        isDefault: false,
        status: 'ready',
        autoCut: true,
        openDrawer: true,
        model: 'Xprinter 58mm Thermal Receipt',
        addedAt: new Date().toISOString(),
      }
    ];
  });
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('pos_printers', JSON.stringify(printers));
  }, [printers]);

  const activePrinter = printers.find(p => p.isDefault) || printers[0] || null;

  const handleSelectDefaultPrinter = (printerId: string) => {
    setPrinters(prev => prev.map(p => ({
      ...p,
      isDefault: p.id === printerId
    })));
  };

  const handleAddPrinter = (newPrinterData: Omit<ConnectedPrinter, 'id'>) => {
    const newPrinter: ConnectedPrinter = {
      ...newPrinterData,
      id: `printer-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      addedAt: new Date().toISOString(),
    };

    setPrinters(prev => {
      if (newPrinter.isDefault) {
        return [...prev.map(p => ({ ...p, isDefault: false })), newPrinter];
      }
      return [...prev, newPrinter];
    });
  };

  const handleDeletePrinter = (printerId: string) => {
    setPrinters(prev => {
      const remaining = prev.filter(p => p.id !== printerId);
      if (remaining.length > 0 && !remaining.some(p => p.isDefault)) {
        remaining[0].isDefault = true;
      }
      return remaining;
    });
  };

  // Set default tab based on user role upon login
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'cashier') {
        setActiveTab('pos');
      } else if (currentUser.role === 'manager') {
        setActiveTab('pos');
      } else {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser]);

  // Fetch data
  const fetchData = async () => {
    try {
      const prodRes = await fetch('/api/products');
      const prodData = await prodRes.json();
      setProducts(prodData);

      const catRes = await fetch('/api/categories');
      const catData = await catRes.json();
      setCategories(catData);

      const custRes = await fetch('/api/customers');
      const custData = await custRes.json();
      setCustomers(custData);

      const reportRes = await fetch('/api/reports/daily');
      const reportData = await reportRes.json();
      setReports(reportData);

      const topRes = await fetch('/api/reports/top-products');
      const topData = await topRes.json();
      setTopProducts(topData);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('pos_user');
    setCurrentUser(null);
    setCart([]);
    setSelectedCustomer(null);
  };

  // Permission helper
  const canAccessTab = (tab: 'dashboard' | 'inventory' | 'pos' | 'reports' | 'customers') => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'manager') {
      return ['pos', 'inventory', 'reports', 'customers'].includes(tab);
    }
    if (currentUser.role === 'cashier') {
      return tab === 'pos';
    }
    return false;
  };

  // --- Category Logic ---
  const handleSaveCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const method = editingCategory ? 'PUT' : 'POST';
    const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setIsCategoryModalOpen(false);
        setEditingCategory(null);
        fetchData();
      }
    } catch (err) {
      console.error("Save category error:", err);
    }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm("Hapus kategori ini?")) return;
    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error("Delete category error:", err);
    }
  };

  // --- POS Logic ---
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } 
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateCartQty = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, Math.min(item.quantity + delta, item.stock));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.sell_price * item.quantity), 0);
  // 10 points = RM 1 discount
  const pointsDiscount = pointsRedeemed > 0 ? pointsRedeemed / 10 : 0;
  const finalTotal = Math.max(0, cartTotal - discount - pointsDiscount);
  // 1 point per RM 1 spent
  const pointsEarned = Math.floor(finalTotal);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          total_amount: finalTotal,
          discount: discount + pointsDiscount,
          payment_method: paymentMethod,
          customer_id: selectedCustomer?.id || null,
          customer_name: selectedCustomer?.name || 'Walk-in',
          cashier_username: currentUser?.username || 'cashier',
          points_earned: selectedCustomer ? pointsEarned : 0,
          points_redeemed: pointsRedeemed,
        })
      });
      const data = await res.json();
      if (res.ok) {
        // Set receipt modal data
        setLastReceipt({
          saleId: data.saleId,
          items: [...cart],
          totalAmount: finalTotal,
          discount: discount + pointsDiscount,
          paymentMethod,
          customer: selectedCustomer,
          cashierName: currentUser?.name || 'Kakitangan',
          pointsEarned: selectedCustomer ? pointsEarned : 0,
          pointsRedeemed,
        });

        setCart([]);
        setDiscount(0);
        setPointsRedeemed(0);
        fetchData();
      } else {
        alert(data.error || "Ralat memproses jualan.");
      }
    } catch (err) {
      console.error("Checkout error:", err);
    }
  };

  const handleQuickAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsQuickCustomerOpen(false);
        const newCust: Customer = { id: data.id, name, phone, email, points: 0 };
        setSelectedCustomer(newCust);
        fetchData();
      } else {
        alert(data.error || 'Gagal mendaftar pelanggan');
      }
    } catch (err) {
      console.error('Add customer error:', err);
    }
  };

  // --- Inventory Product Logic ---
  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const method = editingProduct ? 'PUT' : 'POST';
    const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setIsProductModalOpen(false);
        setEditingProduct(null);
        fetchData();
      }
    } catch (err) {
      console.error("Save product error:", err);
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Hapus produk ini?")) return;
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // If user is not logged in, prompt login screen immediately
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(u) => {
      setCurrentUser(u);
      localStorage.setItem('pos_user', JSON.stringify(u));
    }} />;
  }

  // --- Renderers ---
  const renderDashboard = () => {
    const lowStock = products.filter(p => p.stock <= p.min_stock);
    const todaySales = reports.find(r => r.date === format(new Date(), 'yyyy-MM-dd'))?.revenue || 0;

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 bg-black text-white border-none">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Jualan Hari Ini</p>
                <h2 className="text-3xl font-light">RM {todaySales.toFixed(2)}</h2>
              </div>
              <div className="p-2 bg-zinc-800 rounded-xl">
                <BarChart3 size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Jumlah Produk</p>
                <h2 className="text-3xl font-light">{products.length}</h2>
              </div>
              <div className="p-2 bg-zinc-100 rounded-xl">
                <Package size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Stok Rendah</p>
                <h2 className="text-3xl font-light text-rose-600">{lowStock.length}</h2>
              </div>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <AlertTriangle size={20} />
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Ahli Pelanggan</p>
                <h2 className="text-3xl font-light text-amber-600">{customers.length}</h2>
              </div>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Users size={20} />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-6">Trend Jualan (30 Hari)</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...reports].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    labelFormatter={(val) => format(new Date(val), 'dd MMM yyyy')}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#000" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-6">Amaran Stok Rendah / Kritikal</h3>
            <div className="space-y-3">
              {lowStock.length > 0 ? (
                lowStock.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-zinc-500">Baki: {p.stock} unit (Min: {p.min_stock})</p>
                    </div>
                    <Badge variant="danger">KRITIKAL</Badge>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                  <CheckCircle2 size={40} className="mb-2 opacity-20 text-emerald-600" />
                  <p className="text-sm">Semua paras stok mencukupi.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderInventory = () => {
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.barcode.includes(searchQuery)
    );

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Cari produk atau barcode..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 transition-all text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => { setSelectedProductForBarcode(null); setIsBarcodeGenOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all text-xs font-bold uppercase tracking-wider shadow-md"
            >
              <BarcodeIcon size={16} />
              Jana Barcode (EAN-13)
            </button>
            <button 
              onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-100 text-zinc-900 rounded-xl hover:bg-zinc-200 transition-all text-xs font-bold uppercase tracking-wider"
            >
              Urus Kategori
            </button>
            <button 
              onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-black/10 text-xs font-bold uppercase tracking-wider"
            >
              <Plus size={16} />
              Tambah Produk
            </button>
          </div>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Barcode</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nama Produk</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Kategori</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Harga Jual</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Stok Min.</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Stok</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-zinc-600">{p.barcode}</td>
                    <td className="px-6 py-4 text-sm font-medium">{p.name}</td>
                    <td className="px-6 py-4">
                      <Badge>{p.category}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold">RM {p.sell_price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-zinc-500 font-mono">{p.min_stock}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-bold", 
                          p.stock <= p.min_stock ? "text-rose-600" : 
                          p.stock <= p.min_stock + 2 ? "text-amber-600" : 
                          "text-zinc-900"
                        )}>
                          {p.stock}
                        </span>
                        {p.stock <= p.min_stock ? (
                          <AlertTriangle size={14} className="text-rose-500" />
                        ) : p.stock <= p.min_stock + 2 ? (
                          <AlertTriangle size={14} className="text-amber-500" />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button 
                          onClick={() => { setSelectedProductForBarcode(p); setIsBarcodeGenOpen(true); }}
                          title="Jana & Cetak Barcode Pelekat"
                          className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-all"
                        >
                          <Printer size={16} />
                        </button>
                        <button 
                          onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }}
                          className="p-2 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-lg transition-all"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => deleteProduct(p.id)}
                          className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderPOS = () => {
    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.barcode.includes(searchQuery)
    );

    return (
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-190px)] animate-in zoom-in-95 duration-500">
        {/* Product Catalog */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Cari nama produk atau imbas barcode..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-black/5 transition-all text-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(p => (
                <button
                  key={p.id}
                  disabled={p.stock <= 0}
                  onClick={() => addToCart(p)}
                  className={cn(
                    "flex flex-col text-left p-4 bg-white border border-zinc-200 rounded-2xl transition-all hover:border-black hover:shadow-xl hover:-translate-y-0.5 group",
                    p.stock <= 0 && "opacity-50 grayscale cursor-not-allowed"
                  )}
                >
                  <div className="mb-3 flex justify-between items-start">
                    <Badge>{p.category}</Badge>
                    <span className="text-[10px] font-mono text-zinc-400">{p.barcode}</span>
                  </div>
                  <h4 className="font-bold text-sm mb-1 line-clamp-2 group-hover:text-black">{p.name}</h4>
                  <p className="text-base font-bold mt-auto">RM {p.sell_price.toFixed(2)}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={cn("text-[10px] font-bold", p.stock <= p.min_stock ? "text-rose-600" : "text-zinc-400")}>
                      Baki: {p.stock} unit
                    </span>
                    <div className="p-1.5 bg-zinc-100 rounded-lg group-hover:bg-black group-hover:text-white transition-colors">
                      <Plus size={14} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart & Customer Checkout Sidebar */}
        <div className="w-full lg:w-[410px] flex flex-col gap-3">
          <Card className="flex-1 flex flex-col">
            {/* Header with Cart & Customer Selector */}
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/60 space-y-2.5">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-widest">Bakul Jualan ({cart.length})</h3>
                <button onClick={() => { setCart([]); setPointsRedeemed(0); }} className="text-xs text-rose-600 font-bold hover:underline">
                  Kosongkan
                </button>
              </div>

              {/* Customer Selector Dropdown */}
              <div className="pt-2 border-t border-zinc-200/60 flex items-center gap-2">
                <div className="flex-1">
                  <select
                    value={selectedCustomer ? selectedCustomer.id : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setSelectedCustomer(null);
                        setPointsRedeemed(0);
                      } else {
                        const c = customers.find(cust => cust.id === Number(val));
                        setSelectedCustomer(c || null);
                        setPointsRedeemed(0);
                      }
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none"
                  >
                    <option value="">Pelanggan Biasa (Walk-in)</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone || 'Tiada Tel'}) - {c.points} pts
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerOpen(true)}
                  title="Daftar Pelanggan Baru"
                  className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-zinc-700 transition-colors shrink-0"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Selected Customer Points info */}
              {selectedCustomer && (
                <div className="p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-zinc-900">{selectedCustomer.name}</span>
                    <span className="text-amber-800 font-semibold block text-[11px]">
                      Baki: {selectedCustomer.points} mata kesetiaan
                    </span>
                  </div>
                  {selectedCustomer.points >= 10 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (pointsRedeemed > 0) {
                          setPointsRedeemed(0);
                        } else {
                          // Redeem in blocks of 10 points up to cart total
                          const maxRedeem = Math.min(selectedCustomer.points, Math.floor(cartTotal) * 10);
                          setPointsRedeemed(maxRedeem);
                        }
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors",
                        pointsRedeemed > 0 
                          ? "bg-rose-100 text-rose-700 hover:bg-rose-200" 
                          : "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
                      )}
                    >
                      {pointsRedeemed > 0 ? 'Batal Tebus' : 'Tebus Mata'}
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              <AnimatePresence>
                {cart.map(item => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    key={item.id} 
                    className="flex gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100 group"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-bold line-clamp-1">{item.name}</p>
                      <p className="text-xs text-zinc-500">RM {item.sell_price.toFixed(2)} / unit</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-lg p-0.5">
                        <button onClick={() => updateCartQty(item.id, -1)} className="p-1 hover:bg-zinc-100 rounded"><ChevronLeft size={12} /></button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateCartQty(item.id, 1)} className="p-1 hover:bg-zinc-100 rounded"><ChevronRight size={12} /></button>
                      </div>
                      <p className="text-sm font-bold">RM {(item.sell_price * item.quantity).toFixed(2)}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-zinc-300 hover:text-rose-600 transition-colors">
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {cart.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-16">
                  <ShoppingCart size={44} className="mb-3 opacity-15" />
                  <p className="text-xs font-medium">Bakul jualan kosong</p>
                  <p className="text-[11px] text-zinc-400 mt-1">Pilih produk atau scan barcode untuk mula</p>
                </div>
              )}
            </div>

            {/* Calculations & Checkout */}
            <div className="p-5 bg-zinc-50 border-t border-zinc-100 space-y-3">
              <div className="space-y-1.5 text-xs text-zinc-500">
                <div className="flex justify-between">
                  <span>Subjumlah</span>
                  <span>RM {cartTotal.toFixed(2)}</span>
                </div>
                {pointsRedeemed > 0 && (
                  <div className="flex justify-between text-amber-700 font-medium">
                    <span>Tebus {pointsRedeemed} Mata (Diskaun)</span>
                    <span>- RM {pointsDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span>Diskaun Tambahan</span>
                  <div className="flex items-center gap-1">
                    <span>RM</span>
                    <input 
                      type="number" 
                      className="w-16 px-2 py-0.5 bg-white border border-zinc-200 rounded text-right text-xs"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-200 flex justify-between items-end">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest block text-zinc-400">Jumlah Bersih</span>
                    {selectedCustomer && (
                      <span className="text-[10px] text-emerald-600 font-bold block">
                        +{pointsEarned} mata akan diperoleh
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-black text-zinc-900">RM {finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button 
                  onClick={() => setPaymentMethod('Cash')}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all",
                    paymentMethod === 'Cash' ? "bg-black text-white border-black" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                  )}
                >
                  <Banknote size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Tunai</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('E-Wallet')}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all",
                    paymentMethod === 'E-Wallet' ? "bg-black text-white border-black" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                  )}
                >
                  <CreditCard size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">E-Wallet</span>
                </button>
              </div>

              {/* Active Printer Status & Quick Switch */}
              <div className="flex items-center justify-between p-2.5 bg-zinc-50 border border-zinc-200/80 rounded-xl text-xs">
                <div className="flex items-center gap-2 truncate pr-2">
                  <Printer size={14} className="text-zinc-500 shrink-0" />
                  <div className="truncate">
                    <p className="font-bold text-[11px] text-zinc-900 truncate">
                      {activePrinter ? activePrinter.name : 'Tiada Pencetak'}
                    </p>
                    <p className="text-[9px] text-zinc-400 font-mono">
                      {activePrinter ? `${activePrinter.type.toUpperCase()} • ${activePrinter.paperWidth}` : 'Sila sambung pencetak'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrinterSettingsOpen(true)}
                  className="px-2 py-1 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-700 hover:bg-zinc-100 shrink-0"
                >
                  Urus / Cari
                </button>
              </div>

              <button 
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full py-3.5 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-black/20 hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:grayscale"
              >
                Bayar Sekarang
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderReports = () => {
    const COLORS = ['#000', '#333', '#666', '#999', '#ccc'];
    
    return (
      <div className="space-y-6 animate-in fade-in duration-700">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-8">Prestasi Jualan Harian</h3>
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...reports].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#999' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#999' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8f8f8' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="revenue" fill="#000" radius={[4, 4, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest mb-8">Produk Terlaris</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topProducts}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="total_sold"
                  >
                    {topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-zinc-500">{p.name}</span>
                  </div>
                  <span className="font-bold">{p.total_sold} unit</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="text-sm font-bold uppercase tracking-widest mb-6">Ringkasan Sejarah Transaksi</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 border-b border-zinc-100">
                  <th className="pb-4">Tarikh</th>
                  <th className="pb-4">Jumlah Transaksi</th>
                  <th className="pb-4">Diskaun Diberi</th>
                  <th className="pb-4 text-right">Jumlah Jualan Bersih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {reports.map((r, i) => (
                  <tr key={i} className="text-sm">
                    <td className="py-4 text-zinc-500">{format(new Date(r.date), 'dd MMM yyyy')}</td>
                    <td className="py-4 font-medium">{r.transactions} jualan</td>
                    <td className="py-4 text-zinc-400">RM {(r as any).total_discount?.toFixed(2) || '0.00'}</td>
                    <td className="py-4 text-right font-bold">RM {r.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 font-sans selection:bg-black selection:text-white">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-zinc-200 p-6 z-20 hidden md:flex flex-col justify-between">
        <div>
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/20">
              <ShoppingCart size={22} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none">RazifApps POS</h1>
              <span className="text-[10px] font-mono text-zinc-400 tracking-wider">Suite @ Nasadef™</span>
            </div>
          </div>

          <nav className="space-y-1.5">
            {canAccessTab('dashboard') && (
              <SidebarItem 
                icon={LayoutDashboard} 
                label="Dashboard" 
                active={activeTab === 'dashboard'} 
                onClick={() => setActiveTab('dashboard')} 
              />
            )}
            {canAccessTab('pos') && (
              <SidebarItem 
                icon={ShoppingCart} 
                label="Terminal POS" 
                active={activeTab === 'pos'} 
                badge={cart.length > 0 ? `${cart.length}` : undefined}
                onClick={() => setActiveTab('pos')} 
              />
            )}
            {canAccessTab('inventory') && (
              <SidebarItem 
                icon={Package} 
                label="Inventori & Barcode" 
                active={activeTab === 'inventory'} 
                onClick={() => setActiveTab('inventory')} 
              />
            )}
            {canAccessTab('customers') && (
              <SidebarItem 
                icon={Users} 
                label="Pelanggan & Mata" 
                active={activeTab === 'customers'} 
                onClick={() => setActiveTab('customers')} 
              />
            )}
            {canAccessTab('reports') && (
              <SidebarItem 
                icon={BarChart3} 
                label="Laporan Jualan" 
                active={activeTab === 'reports'} 
                onClick={() => setActiveTab('reports')} 
              />
            )}
            <div className="pt-2 border-t border-zinc-100">
              <SidebarItem 
                icon={Printer} 
                label="Urus & Cari Pencetak" 
                active={isPrinterSettingsOpen} 
                badge={activePrinter ? activePrinter.paperWidth : undefined}
                onClick={() => setIsPrinterSettingsOpen(true)} 
              />
            </div>
          </nav>
        </div>

        {/* Sidebar Footer with user info & watermark */}
        <div className="space-y-3 pt-4 border-t border-zinc-100">
          <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Pengguna Semasa</span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                currentUser.role === 'admin' ? 'bg-black text-white' : 
                currentUser.role === 'manager' ? 'bg-blue-100 text-blue-800' : 'bg-zinc-200 text-zinc-700'
              }`}>
                {currentUser.role}
              </span>
            </div>
            <p className="text-xs font-bold text-zinc-900 truncate">{currentUser.name}</p>
            <p className="text-[10px] text-zinc-500 font-mono">@{currentUser.username}</p>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
            {currentUser.role === 'admin' && (
              <button
                type="button"
                onClick={() => setIsUserMgmtOpen(true)}
                className="text-[11px] font-bold text-zinc-700 hover:text-black flex items-center gap-1"
              >
                <Shield size={13} />
                Urus Pengguna
              </button>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 ml-auto"
            >
              <LogOut size={13} />
              Log Keluar
            </button>
          </div>

          <div className="text-center pt-2 text-[10px] font-mono text-zinc-400 select-none">
            RazifApps@Nasadef™
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="md:ml-64 p-6 md:p-8">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight capitalize">
                {activeTab === 'pos' ? 'Terminal POS (Jualan)' : 
                 activeTab === 'inventory' ? 'Pengurusan Inventori & Barcode' :
                 activeTab === 'customers' ? 'Pengurusan Pelanggan & Ganjaran' :
                 activeTab === 'reports' ? 'Laporan Prestasi & Keuntungan' : 'Dashboard Utama'}
              </h2>
              <span className="hidden sm:inline-block px-2.5 py-0.5 bg-zinc-100 border border-zinc-200 text-zinc-600 rounded-full text-[10px] font-mono">
                RazifApps@Nasadef™
              </span>
            </div>
            <p className="text-zinc-500 text-xs mt-1">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Printer Button in Header */}
            <button
              type="button"
              onClick={() => setIsPrinterSettingsOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl text-xs font-medium text-zinc-700 shadow-sm transition-all group"
              title="Tetapan & Carian Pencetak Bersambung"
            >
              <div className="p-1 bg-zinc-100 rounded-lg group-hover:bg-zinc-200 text-zinc-700">
                <Printer size={14} />
              </div>
              <div className="text-left">
                <span className="font-bold text-zinc-900 block leading-tight max-w-[140px] truncate">
                  {activePrinter ? activePrinter.name : 'Tiada Pencetak'}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {activePrinter ? `${activePrinter.paperWidth} • Sedia` : 'Klik untuk imbas'}
                </span>
              </div>
            </button>

            <div className="text-right">
              <p className="text-xs font-bold">{currentUser.name}</p>
              <p className="text-[10px] text-zinc-400 capitalize font-medium">{currentUser.role} • Kedai Runcit</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-black text-white font-bold flex items-center justify-center text-xs shadow-md">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Log Keluar"
              className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors md:hidden"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && canAccessTab('dashboard') && renderDashboard()}
        {activeTab === 'inventory' && canAccessTab('inventory') && renderInventory()}
        {activeTab === 'pos' && canAccessTab('pos') && renderPOS()}
        {activeTab === 'reports' && canAccessTab('reports') && renderReports()}
        {activeTab === 'customers' && canAccessTab('customers') && <CustomerManagement />}
      </main>

      {/* Product Add / Edit Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="text-lg font-bold">{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Barcode / Kod Bar</label>
                  <input name="barcode" defaultValue={editingProduct?.barcode} required className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 text-sm font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Kategori</label>
                  <select name="category" defaultValue={editingProduct?.category} className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 text-sm font-medium">
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nama Produk</label>
                <input name="name" defaultValue={editingProduct?.name} required className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 text-sm font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Harga Beli (RM)</label>
                  <input name="buy_price" type="number" step="0.01" defaultValue={editingProduct?.buy_price} required className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Harga Jual (RM)</label>
                  <input name="sell_price" type="number" step="0.01" defaultValue={editingProduct?.sell_price} required className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Stok Semasa</label>
                  <input name="stock" type="number" defaultValue={editingProduct?.stock} required className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Stok Minimum (Amaran)</label>
                  <input name="min_stock" type="number" defaultValue={editingProduct?.min_stock} required className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 text-sm" />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-3 border border-zinc-200 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-zinc-50">Batal</button>
                <button type="submit" className="flex-1 py-3 bg-black text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-black/20 hover:bg-zinc-800">Simpan Produk</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="text-lg font-bold">Urus Kategori</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <form onSubmit={handleSaveCategory} className="flex gap-2">
                <input 
                  name="name" 
                  placeholder="Nama kategori baru..." 
                  defaultValue={editingCategory?.name}
                  required 
                  className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 text-sm" 
                />
                <button type="submit" className="px-4 py-2 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest">
                  {editingCategory ? 'Simpan' : 'Tambah'}
                </button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <span className="text-sm font-medium">{cat.name}</span>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingCategory(cat); }} className="p-1.5 text-zinc-400 hover:text-black transition-colors">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Quick Add Customer Modal from POS */}
      {isQuickCustomerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
              <h3 className="text-sm font-bold uppercase tracking-wider">Daftar Pelanggan Segera</h3>
              <button onClick={() => setIsQuickCustomerOpen(false)} className="p-1.5 hover:bg-zinc-200 rounded-full">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleQuickAddCustomer} className="p-5 space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Nama Penuh</label>
                <input required name="name" placeholder="cth: Siti Sarah" className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">No. Telefon</label>
                <input name="phone" placeholder="cth: 012-3456789" className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Emel (Pilihan)</label>
                <input name="email" type="email" placeholder="cth: sarah@example.com" className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none" />
              </div>
              <div className="pt-3 flex gap-2">
                <button type="button" onClick={() => setIsQuickCustomerOpen(false)} className="flex-1 py-2.5 border border-zinc-200 rounded-xl text-xs font-bold uppercase tracking-wider">Batal</button>
                <button type="submit" className="flex-1 py-2.5 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider">Daftar & Pilih</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Barcode Generator & Printer Modal */}
      {isBarcodeGenOpen && (
        <BarcodeGeneratorModal
          products={products}
          initialProduct={selectedProductForBarcode}
          activePrinter={activePrinter}
          onOpenPrinterSettings={() => setIsPrinterSettingsOpen(true)}
          onClose={() => { setIsBarcodeGenOpen(false); setSelectedProductForBarcode(null); }}
        />
      )}

      {/* User Management Modal (Admin only) */}
      {isUserMgmtOpen && currentUser.role === 'admin' && (
        <UserManagementModal
          currentUser={currentUser}
          onClose={() => setIsUserMgmtOpen(false)}
        />
      )}

      {/* Receipt Modal */}
      {lastReceipt && (
        <ReceiptModal
          saleId={lastReceipt.saleId}
          items={lastReceipt.items}
          totalAmount={lastReceipt.totalAmount}
          discount={lastReceipt.discount}
          paymentMethod={lastReceipt.paymentMethod}
          customer={lastReceipt.customer}
          cashierName={lastReceipt.cashierName}
          pointsEarned={lastReceipt.pointsEarned}
          pointsRedeemed={lastReceipt.pointsRedeemed}
          activePrinter={activePrinter}
          onOpenPrinterSettings={() => setIsPrinterSettingsOpen(true)}
          onClose={() => setLastReceipt(null)}
        />
      )}

      {/* Printer Settings, Search & Discovery Modal */}
      {isPrinterSettingsOpen && (
        <PrinterSettingsModal
          printers={printers}
          activePrinter={activePrinter}
          onSelectDefault={handleSelectDefaultPrinter}
          onAddPrinter={handleAddPrinter}
          onDeletePrinter={handleDeletePrinter}
          onClose={() => setIsPrinterSettingsOpen(false)}
        />
      )}
    </div>
  );
}
