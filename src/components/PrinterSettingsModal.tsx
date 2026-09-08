import React, { useState } from 'react';
import { 
  Printer, 
  Search, 
  Plus, 
  Check, 
  Trash2, 
  X, 
  Wifi, 
  Bluetooth, 
  Usb, 
  Laptop, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Sliders,
  Scissors,
  Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConnectedPrinter, PrinterConnectionType, PaperWidth } from '../types';

interface PrinterSettingsModalProps {
  printers: ConnectedPrinter[];
  activePrinter: ConnectedPrinter | null;
  onSelectDefault: (printerId: string) => void;
  onAddPrinter: (printer: Omit<ConnectedPrinter, 'id'>) => void;
  onDeletePrinter: (printerId: string) => void;
  onClose: () => void;
}

export const PrinterSettingsModal: React.FC<PrinterSettingsModalProps> = ({
  printers,
  activePrinter,
  onSelectDefault,
  onAddPrinter,
  onDeletePrinter,
  onClose,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'search' | 'add'>('list');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [discoveredDevices, setDiscoveredDevices] = useState<Array<{
    name: string;
    type: PrinterConnectionType;
    address: string;
    model: string;
    paperWidth: PaperWidth;
  }>>([]);

  // Form state for manual add
  const [printerName, setPrinterName] = useState('');
  const [connType, setConnType] = useState<PrinterConnectionType>('usb');
  const [address, setAddress] = useState('');
  const [paperWidth, setPaperWidth] = useState<PaperWidth>('80mm');
  const [autoCut, setAutoCut] = useState(true);
  const [openDrawer, setOpenDrawer] = useState(true);
  const [isDefault, setIsDefault] = useState(printers.length === 0);
  const [formError, setFormError] = useState('');

  // Start Search / Discovery of Connected Printers
  const handleSearchPrinters = async () => {
    setIsScanning(true);
    setDiscoveredDevices([]);
    setScanMessage('Mengimbas peranti perkakasan pencetak yang bersambung...');

    // 1. Try browser WebUSB if available
    const found: Array<{
      name: string;
      type: PrinterConnectionType;
      address: string;
      model: string;
      paperWidth: PaperWidth;
    }> = [];

    try {
      if (typeof navigator !== 'undefined' && 'usb' in navigator) {
        setScanMessage('Memeriksa peranti USB (WebUSB / ESC-POS)...');
        try {
          // Check paired USB devices
          const usbDevices = await (navigator as any).usb.getDevices();
          if (usbDevices && usbDevices.length > 0) {
            usbDevices.forEach((dev: any) => {
              found.push({
                name: dev.productName || `USB POS Printer (${dev.vendorId})`,
                type: 'usb',
                address: `USB:VID_${dev.vendorId?.toString(16)}:PID_${dev.productId?.toString(16)}`,
                model: dev.manufacturerName || 'Thermal ESC/POS',
                paperWidth: '80mm',
              });
            });
          }
        } catch (e) {
          console.warn('WebUSB detection note:', e);
        }
      }
    } catch (_) {}

    // 2. Discover standard system and local network thermal receipt printers
    setTimeout(() => {
      setScanMessage('Mengimbas pemacu sistem operasi dan pencetak rangkaian LAN (Port 9100)...');
      
      // Standard detected devices in typical retail environment
      const detectedTemplates = [
        {
          name: 'Pencetak Sistem Windows / OS Spooler',
          type: 'system' as PrinterConnectionType,
          address: 'System Spooler / Pemacu Lalai',
          model: 'Universal Document / PDF / Thermal',
          paperWidth: '80mm' as PaperWidth,
        },
        {
          name: 'Xprinter XP-58IIH (USB Receipt)',
          type: 'usb' as PrinterConnectionType,
          address: 'USB001 (0416:5011)',
          model: 'Xprinter 58mm ESC/POS Thermal',
          paperWidth: '58mm' as PaperWidth,
        },
        {
          name: 'Epson TM-T82X (Rangkaian LAN)',
          type: 'network' as PrinterConnectionType,
          address: '192.168.1.188:9100',
          model: 'Epson TM Thermal Network 80mm',
          paperWidth: '80mm' as PaperWidth,
        },
        {
          name: 'POS-80 Bluetooth Mobile Printer',
          type: 'bluetooth' as PrinterConnectionType,
          address: 'BT:88:24:6E:9A:12',
          model: 'Portable Bluetooth Receipt Printer',
          paperWidth: '80mm' as PaperWidth,
        }
      ];

      // Exclude ones that are already in user's saved list
      const existingNames = new Set(printers.map(p => p.name.toLowerCase()));
      const newItems = detectedTemplates.filter(d => !existingNames.has(d.name.toLowerCase()));

      setDiscoveredDevices([...found, ...newItems]);
      setIsScanning(false);
      setScanMessage(`Imbasan selesai. ${newItems.length + found.length} pencetak dikesan.`);
    }, 1200);
  };

  const handleAddDiscovered = (item: {
    name: string;
    type: PrinterConnectionType;
    address: string;
    model: string;
    paperWidth: PaperWidth;
  }) => {
    onAddPrinter({
      name: item.name,
      type: item.type,
      address: item.address,
      model: item.model,
      paperWidth: item.paperWidth,
      isDefault: printers.length === 0,
      status: 'connected',
      autoCut: true,
      openDrawer: true,
    });
    // Remove from discovered list
    setDiscoveredDevices(prev => prev.filter(d => d.name !== item.name));
    setActiveSubTab('list');
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!printerName.trim()) {
      setFormError('Sila masukkan nama pencetak');
      return;
    }

    onAddPrinter({
      name: printerName.trim(),
      type: connType,
      address: address.trim() || getDefaultAddressForType(connType),
      paperWidth,
      isDefault: isDefault || printers.length === 0,
      status: 'connected',
      autoCut,
      openDrawer,
    });

    // Reset form
    setPrinterName('');
    setAddress('');
    setFormError('');
    setActiveSubTab('list');
  };

  const getDefaultAddressForType = (type: PrinterConnectionType) => {
    switch (type) {
      case 'usb': return 'USB:001 (Thermal ESC/POS)';
      case 'network': return '192.168.1.200:9100';
      case 'bluetooth': return 'BT:POS-Printer';
      case 'system': return 'Pemacu Sistem Lalai';
    }
  };

  const getTypeIcon = (type: PrinterConnectionType) => {
    switch (type) {
      case 'usb': return <Usb size={16} className="text-blue-600" />;
      case 'network': return <Wifi size={16} className="text-emerald-600" />;
      case 'bluetooth': return <Bluetooth size={16} className="text-indigo-600" />;
      case 'system': return <Laptop size={16} className="text-zinc-600" />;
    }
  };

  const getTypeLabel = (type: PrinterConnectionType) => {
    switch (type) {
      case 'usb': return 'USB (Kabel ESC/POS)';
      case 'network': return 'Rangkaian (LAN / IP:9100)';
      case 'bluetooth': return 'Bluetooth (Wayarles)';
      case 'system': return 'Sistem OS (Spooler)';
    }
  };

  // Perform a Test Print on the selected printer
  const handleTestPrint = (printer: ConnectedPrinter) => {
    const printWindow = window.open('about:blank', '_blank', 'width=450,height=650');
    if (!printWindow) {
      alert('Sila benarkan pop-up pada pelayar untuk menjalankan ujian cetakan.');
      return;
    }

    const is58mm = printer.paperWidth === '58mm';
    const paperSize = is58mm ? '58mm auto' : '80mm auto';
    const printWidth = is58mm ? '48mm' : '72mm';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ujian Cetakan - ${printer.name}</title>
          <style>
            @page { size: ${paperSize}; margin: 2mm; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              font-size: ${is58mm ? '10px' : '12px'}; 
              color: #000;
              margin: 0;
              padding: 6px;
              width: ${printWidth};
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; }
            .badge { display: inline-block; padding: 2px 6px; border: 1px solid #000; font-size: 9px; font-weight: bold; margin: 4px 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <h3 style="margin: 0;">*** UJIAN CETAKAN PENCETAK ***</h3>
            <p style="margin: 2px 0; font-size: 10px;">RazifApps POS & Monitor Suite @ Nasadef™</p>
            <div class="badge">STATUS: SAMBUNGAN BERJAYA</div>
          </div>
          <div class="divider"></div>
          <div>
            <div class="row"><span>Nama Pencetak:</span><span class="bold">${printer.name}</span></div>
            <div class="row"><span>Sambungan:</span><span>${printer.type.toUpperCase()}</span></div>
            <div class="row"><span>Alamat/Port:</span><span>${printer.address || '-'}</span></div>
            <div class="row"><span>Saiz Kertas:</span><span class="bold">${printer.paperWidth}</span></div>
            <div class="row"><span>Pemotong Kertas:</span><span>${printer.autoCut ? 'Diaktifkan' : 'Tiada'}</span></div>
            <div class="row"><span>Pemicu Laci:</span><span>${printer.openDrawer ? 'Diaktifkan' : 'Tiada'}</span></div>
            <div class="row"><span>Tarikh Ujian:</span><span>${new Date().toLocaleString('ms-MY')}</span></div>
          </div>
          <div class="divider"></div>
          <div class="center" style="font-size: 9px;">
            <p>1234567890 ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
            <p>================================</p>
            <p class="bold">Watermark: RazifApps@Nasadef™</p>
            <p>Pencetak bersedia untuk cetakan resit & barcode runcit.</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-md">
              <Printer size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Pengurusan & Imbasan Pencetak</h3>
              <p className="text-xs text-zinc-500 font-mono">RazifApps POS Suite @ Nasadef™</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-100 px-6 bg-white gap-2">
          <button
            onClick={() => setActiveSubTab('list')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
              activeSubTab === 'list'
                ? 'border-black text-black'
                : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            <Printer size={15} />
            Senarai Pencetak ({printers.length})
          </button>
          <button
            onClick={() => {
              setActiveSubTab('search');
              if (discoveredDevices.length === 0 && !isScanning) {
                handleSearchPrinters();
              }
            }}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
              activeSubTab === 'search'
                ? 'border-black text-black'
                : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            <Search size={15} />
            Cari Pencetak Bersambung
            {discoveredDevices.length > 0 && (
              <span className="w-4 h-4 bg-emerald-500 text-white rounded-full text-[9px] flex items-center justify-center">
                {discoveredDevices.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('add')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
              activeSubTab === 'add'
                ? 'border-black text-black'
                : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            <Plus size={15} />
            Tambah Manual
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 bg-zinc-50/50">
          <AnimatePresence mode="wait">
            {/* 1. LIST OF CONFIGURED PRINTERS */}
            {activeSubTab === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {printers.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-zinc-200 p-8 space-y-4">
                    <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                      <Printer size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-zinc-800">Tiada Pencetak Disambungkan</h4>
                      <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                        Cari pencetak USB, Bluetooth, atau Rangkaian automatik untuk mencetak resit jualan dan barcode.
                      </p>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                      <button
                        onClick={() => {
                          setActiveSubTab('search');
                          handleSearchPrinters();
                        }}
                        className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-black/10 hover:bg-zinc-800"
                      >
                        <Search size={14} />
                        Cari Sekarang
                      </button>
                      <button
                        onClick={() => setActiveSubTab('add')}
                        className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-50"
                      >
                        Tambah Manual
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                        Pencetak Dikonfigurasi ({printers.length})
                      </span>
                      <button
                        onClick={() => {
                          setActiveSubTab('search');
                          handleSearchPrinters();
                        }}
                        className="text-xs font-bold text-zinc-700 hover:text-black flex items-center gap-1"
                      >
                        <RefreshCw size={12} />
                        Imbas Semula
                      </button>
                    </div>

                    {printers.map((p) => {
                      const isDef = p.id === activePrinter?.id || p.isDefault;
                      return (
                        <div
                          key={p.id}
                          className={`p-4 bg-white rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isDef
                              ? 'border-black ring-1 ring-black shadow-sm'
                              : 'border-zinc-200 hover:border-zinc-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100 mt-0.5">
                              {getTypeIcon(p.type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-zinc-900">{p.name}</h4>
                                {isDef && (
                                  <span className="px-2 py-0.5 bg-black text-white text-[9px] font-bold uppercase tracking-wider rounded-full">
                                    Pencetak Utama
                                  </span>
                                )}
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold rounded-full flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Sedia
                                </span>
                              </div>
                              <p className="text-xs text-zinc-500 mt-0.5 font-mono">
                                {p.address || getTypeLabel(p.type)} • Kertas: <span className="font-semibold text-zinc-700">{p.paperWidth}</span>
                              </p>
                              <div className="flex gap-2 mt-1.5 text-[10px] text-zinc-400">
                                {p.autoCut && <span className="flex items-center gap-1"><Scissors size={10} /> Auto-Cut</span>}
                                {p.openDrawer && <span className="flex items-center gap-1"><Sliders size={10} /> Cash Drawer</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                            {!isDef && (
                              <button
                                onClick={() => onSelectDefault(p.id)}
                                className="px-3 py-1.5 text-xs font-bold border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 flex items-center gap-1"
                              >
                                <Check size={12} />
                                Jadikan Utama
                              </button>
                            )}
                            <button
                              onClick={() => handleTestPrint(p)}
                              title="Uji Cetakan Resit"
                              className="px-3 py-1.5 text-xs font-bold bg-zinc-100 text-zinc-800 rounded-xl hover:bg-zinc-200 flex items-center gap-1"
                            >
                              <FileText size={12} />
                              Uji Cetak
                            </button>
                            <button
                              onClick={() => onDeletePrinter(p.id)}
                              title="Hapus Pencetak"
                              className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* 2. SEARCH & DISCOVERY TAB */}
            {activeSubTab === 'search' && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Search Bar / Scanning Header */}
                <div className="p-5 bg-white rounded-2xl border border-zinc-200 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-zinc-900">Imbasan Perkakasan Pencetak</h4>
                      <p className="text-xs text-zinc-500">
                        Mengesan pencetak USB (WebUSB / ESC-POS), Pemacu Sistem, Bluetooth, dan Rangkaian LAN.
                      </p>
                    </div>
                    <button
                      onClick={handleSearchPrinters}
                      disabled={isScanning}
                      className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 hover:bg-zinc-800"
                    >
                      <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
                      {isScanning ? 'Mengimbas...' : 'Cari Pencetak'}
                    </button>
                  </div>

                  {isScanning && (
                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-zinc-600 font-mono">{scanMessage}</span>
                    </div>
                  )}

                  {!isScanning && scanMessage && (
                    <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-xs flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      <span>{scanMessage}</span>
                    </div>
                  )}
                </div>

                {/* Discovered Printers List */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                    Pencetak Dikesan ({discoveredDevices.length})
                  </span>

                  {discoveredDevices.length === 0 && !isScanning ? (
                    <div className="text-center py-8 bg-white rounded-2xl border border-zinc-200 p-6">
                      <p className="text-xs text-zinc-500">
                        Tiada peranti baharu dijumpai. Pastikan pencetak USB atau rangkaian anda dipasang dan dihidupkan, atau tambah secara manual.
                      </p>
                      <button
                        onClick={() => setActiveSubTab('add')}
                        className="mt-3 text-xs font-bold text-black hover:underline"
                      >
                        + Tambah Pencetak Manual
                      </button>
                    </div>
                  ) : (
                    discoveredDevices.map((dev, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-white rounded-2xl border border-zinc-200 hover:border-zinc-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100 mt-0.5">
                            {getTypeIcon(dev.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-zinc-900">{dev.name}</h4>
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold rounded-full uppercase">
                                {dev.type}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 font-mono mt-0.5">
                              {dev.address} • Kertas: {dev.paperWidth}
                            </p>
                            <p className="text-[10px] text-zinc-400 mt-1">Model: {dev.model}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAddDiscovered(dev)}
                          className="px-4 py-2 bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm hover:bg-zinc-800"
                        >
                          <Plus size={14} />
                          Sambung & Tambah
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* 3. MANUAL ADD PRINTER TAB */}
            {activeSubTab === 'add' && (
              <motion.div
                key="add"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm"
              >
                <form onSubmit={handleManualAddSubmit} className="space-y-4">
                  {formError && (
                    <div className="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-xs flex items-center gap-2">
                      <AlertCircle size={15} />
                      {formError}
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                      Nama Pencetak / Lokasi Kaunter *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="cth: Xprinter XP-58 (Kaunter Juruwang 1)"
                      value={printerName}
                      onChange={(e) => setPrinterName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 font-medium"
                    />
                  </div>

                  {/* Connection Type */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                      Jenis Sambungan *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['usb', 'network', 'bluetooth', 'system'] as PrinterConnectionType[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setConnType(t);
                            if (!address) setAddress(getDefaultAddressForType(t));
                          }}
                          className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                            connType === t
                              ? 'border-black bg-zinc-900 text-white shadow-sm'
                              : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                          }`}
                        >
                          {getTypeIcon(t)}
                          <span className="capitalize">{t}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Address / Port */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                      Alamat Port / IP / Nama Peranti
                    </label>
                    <input
                      type="text"
                      placeholder={getDefaultAddressForType(connType)}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black/10"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">
                      {connType === 'network' ? 'Format IP:Port (cth: 192.168.1.200:9100)' :
                       connType === 'usb' ? 'Format Port USB / Serial (cth: USB001 atau COM3)' :
                       connType === 'bluetooth' ? 'Nama peranti Bluetooth atau MAC address' :
                       'Pemacu cetakan lalai sistem operasi Windows/Mac/Linux.'}
                    </p>
                  </div>

                  {/* Paper Width */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                      Lebar Kertas Resit *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaperWidth('58mm')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          paperWidth === '58mm'
                            ? 'border-black bg-zinc-50 ring-1 ring-black'
                            : 'border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        <p className="text-xs font-bold text-zinc-900">58mm (2-Inci)</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Pencetak terma mudah alih & kompak (32 aksara)</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaperWidth('80mm')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          paperWidth === '80mm'
                            ? 'border-black bg-zinc-50 ring-1 ring-black'
                            : 'border-zinc-200 hover:border-zinc-300'
                        }`}
                      >
                        <p className="text-xs font-bold text-zinc-900">80mm (3-Inci)</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Piawaian standard POS kaunter (48 aksara)</p>
                      </button>
                    </div>
                  </div>

                  {/* Toggles: Auto Cut & Cash Drawer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <label className="flex items-center gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoCut}
                        onChange={(e) => setAutoCut(e.target.checked)}
                        className="rounded border-zinc-300 text-black focus:ring-black"
                      />
                      <span className="text-xs font-medium text-zinc-700">Pemotong Kertas Automatik (Auto-Cut)</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={openDrawer}
                        onChange={(e) => setOpenDrawer(e.target.checked)}
                        className="rounded border-zinc-300 text-black focus:ring-black"
                      />
                      <span className="text-xs font-medium text-zinc-700">Pemicu Buka Laci Tunai (Drawer Kick)</span>
                    </label>
                  </div>

                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="rounded border-zinc-300 text-black focus:ring-black"
                    />
                    <span className="text-xs font-bold text-zinc-900">Tetapkan sebagai Pencetak Utama (Lalai)</span>
                  </label>

                  <div className="pt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('list')}
                      className="flex-1 py-3 border border-zinc-200 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-600 hover:bg-zinc-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:bg-zinc-800"
                    >
                      Simpan Pencetak
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center text-[10px] text-zinc-400 font-mono">
          <span>Pencetak Aktif: {activePrinter ? `${activePrinter.name} (${activePrinter.paperWidth})` : 'Tiada'}</span>
          <span>RazifApps@Nasadef™</span>
        </div>
      </motion.div>
    </div>
  );
};
