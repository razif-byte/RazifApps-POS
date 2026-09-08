import React, { useState, useRef } from 'react';
import { 
  Barcode as BarcodeIcon, 
  Printer, 
  Download, 
  X, 
  Sparkles, 
  Check, 
  Copy,
  Tag
} from 'lucide-react';
import { motion } from 'motion/react';
import Barcode from 'react-barcode';
import { Product, ConnectedPrinter } from '../types';

interface BarcodeGeneratorModalProps {
  products: Product[];
  initialProduct?: Product | null;
  activePrinter?: ConnectedPrinter | null;
  onOpenPrinterSettings?: () => void;
  onClose: () => void;
}

// Helper to generate valid EAN-13 barcode with checksum
function generateEAN13(base12?: string): string {
  let digits = base12;
  if (!digits || digits.length !== 12 || !/^\d{12}$/.test(digits)) {
    // 955 is Malaysia prefix, followed by 9 random digits
    digits = '955' + Math.floor(100000000 + Math.random() * 900000000).toString();
  }
  // Compute checksum for EAN-13
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return digits + checksum;
}

export const BarcodeGeneratorModal: React.FC<BarcodeGeneratorModalProps> = ({
  products,
  initialProduct,
  activePrinter,
  onOpenPrinterSettings,
  onClose,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<number | 'custom'>(
    initialProduct ? initialProduct.id : 'custom'
  );
  const [barcodeValue, setBarcodeValue] = useState<string>(
    initialProduct?.barcode || '9551234567894'
  );
  const [productName, setProductName] = useState<string>(
    initialProduct?.name || 'Produk Contoh'
  );
  const [productPrice, setProductPrice] = useState<string>(
    initialProduct ? initialProduct.sell_price.toFixed(2) : '10.00'
  );
  const [barcodeFormat, setBarcodeFormat] = useState<'CODE128' | 'EAN13'>('CODE128');
  const [showPrice, setShowPrice] = useState(true);
  const [copied, setCopied] = useState(false);
  const barcodeRef = useRef<HTMLDivElement>(null);

  const handleProductSelect = (idStr: string) => {
    if (idStr === 'custom') {
      setSelectedProductId('custom');
      return;
    }
    const p = products.find(prod => prod.id === Number(idStr));
    if (p) {
      setSelectedProductId(p.id);
      setBarcodeValue(p.barcode);
      setProductName(p.name);
      setProductPrice(p.sell_price.toFixed(2));
      // If barcode is 13 digits numeric, offer EAN-13
      if (/^\d{13}$/.test(p.barcode)) {
        setBarcodeFormat('EAN13');
      } else {
        setBarcodeFormat('CODE128');
      }
    }
  };

  const handleGenerateEAN13 = () => {
    const ean = generateEAN13();
    setBarcodeValue(ean);
    setBarcodeFormat('EAN13');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(barcodeValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printContent = barcodeRef.current;
    if (!printContent) return;

    const printWindow = window.open('about:blank', '_blank', 'width=800,height=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Barcode - ${productName}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 80vh;
              margin: 0;
            }
            .label-card {
              border: 1.5px dashed #333;
              border-radius: 12px;
              padding: 16px 24px;
              text-align: center;
              width: 320px;
              background: #fff;
            }
            .store-tag {
              font-size: 10px;
              font-weight: 800;
              letter-spacing: 1.5px;
              text-transform: uppercase;
              color: #666;
              margin-bottom: 6px;
            }
            .prod-title {
              font-size: 15px;
              font-weight: bold;
              margin: 4px 0 8px 0;
              color: #000;
            }
            .prod-price {
              font-size: 18px;
              font-weight: 800;
              margin-top: 6px;
              color: #000;
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="store-tag">RazifApps@Nasadef™</div>
            <div class="prod-title">${productName}</div>
            <div style="display: flex; justify-content: center;">
              ${printContent.querySelector('svg')?.outerHTML || ''}
            </div>
            ${showPrice ? `<div class="prod-price">RM ${productPrice}</div>` : ''}
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

  const handleDownloadImage = () => {
    const svgEl = barcodeRef.current?.querySelector('svg');
    if (!svgEl) {
      alert('Barcode tidak dapat dieksport.');
      return;
    }

    // Convert SVG to Canvas and download as PNG
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const blobURL = window.URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const padding = 20;
      canvas.width = image.width + padding * 2;
      canvas.height = image.height + padding * 2 + 50; // extra space for title & watermark
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header watermark
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#888888';
        ctx.textAlign = 'center';
        ctx.fillText('RazifApps@Nasadef™', canvas.width / 2, 18);

        // Product Name
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#000000';
        ctx.fillText(productName, canvas.width / 2, 36);

        // Draw Barcode SVG
        ctx.drawImage(image, padding, 46);

        if (showPrice) {
          ctx.font = 'bold 16px sans-serif';
          ctx.fillStyle = '#000000';
          ctx.fillText(`RM ${productPrice}`, canvas.width / 2, canvas.height - 10);
        }

        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `barcode_${barcodeValue}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      window.URL.revokeObjectURL(blobURL);
    };
    image.src = blobURL;
  };

  const isValidForFormat = () => {
    if (barcodeFormat === 'EAN13') {
      return /^\d{13}$/.test(barcodeValue);
    }
    return barcodeValue.trim().length > 0;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-black text-white rounded-xl shadow-md">
              <BarcodeIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Penjana Barcode Produk</h3>
              <p className="text-xs text-zinc-500">Jana, cetak atau muat turun pelekat barcode (EAN-13 / Code128)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200/60 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Product selector / custom input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Pilih Produk Sedia Ada</label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="custom">-- Masukkan Kod Tersuai --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.barcode})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Format Barcode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBarcodeFormat('CODE128')}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    barcodeFormat === 'CODE128'
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  Code 128
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBarcodeFormat('EAN13');
                    if (!/^\d{13}$/.test(barcodeValue)) {
                      handleGenerateEAN13();
                    }
                  }}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    barcodeFormat === 'EAN13'
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  EAN-13 (Runcit)
                </button>
              </div>
            </div>
          </div>

          {/* Barcode code & quick generate */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Kod Barcode {barcodeFormat === 'EAN13' && '(Wajib 13 Digit Angka)'}
              </label>
              <button
                type="button"
                onClick={handleGenerateEAN13}
                className="text-[11px] font-bold text-zinc-700 hover:text-black flex items-center gap-1 underline underline-offset-2"
              >
                <Sparkles size={13} className="text-amber-500" />
                Jana EAN-13 Automatik (Prefix 955)
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={barcodeValue}
                onChange={(e) => setBarcodeValue(e.target.value)}
                placeholder="cth: 9551234567894"
                className="flex-1 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              />
              <button
                type="button"
                onClick={handleCopyCode}
                title="Salin Kod"
                className="px-3.5 py-2.5 bg-zinc-100 border border-zinc-200 rounded-xl hover:bg-zinc-200 text-xs font-bold transition-colors flex items-center gap-1"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copied ? 'Disalin' : 'Salin'}
              </button>
            </div>
            {barcodeFormat === 'EAN13' && !/^\d{13}$/.test(barcodeValue) && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">
                Format EAN-13 memerlukan tepat 13 digit angka dengan checksum sah.
              </p>
            )}
          </div>

          {/* Product label meta details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nama Pada Pelekat</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="cth: Roti Putih Gardenia"
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Harga (RM)</label>
                <label className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded text-black"
                  />
                  Papar Harga
                </label>
              </div>
              <input
                type="number"
                step="0.01"
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                placeholder="cth: 3.50"
                className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-center">
              Pratonton Pelekat Barcode
            </p>
            <div className="flex justify-center">
              <div
                ref={barcodeRef}
                className="p-5 bg-white border-2 border-dashed border-zinc-300 rounded-2xl flex flex-col items-center justify-center min-w-[280px] shadow-sm"
              >
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                  RazifApps@Nasadef™
                </span>
                <p className="font-bold text-sm text-zinc-900 mb-2 text-center max-w-[240px] truncate">
                  {productName || 'Nama Produk'}
                </p>

                {isValidForFormat() ? (
                  <Barcode
                    value={barcodeValue}
                    format={barcodeFormat}
                    width={1.7}
                    height={75}
                    fontSize={13}
                    displayValue={true}
                    background="#ffffff"
                  />
                ) : (
                  <div className="py-8 text-xs text-rose-500 font-medium text-center">
                    Kod tidak sah untuk format {barcodeFormat}
                  </div>
                )}

                {showPrice && (
                  <p className="mt-2 text-base font-black text-zinc-900">
                    RM {Number(productPrice || 0).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-5 border-t border-zinc-100 bg-zinc-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-600 w-full sm:w-auto">
            <Printer size={14} className="text-zinc-500" />
            <span className="font-medium truncate max-w-[180px]">
              {activePrinter ? activePrinter.name : 'Pencetak Sistem'}
            </span>
            <span className="px-1.5 py-0.5 text-[9px] bg-white border border-zinc-200 rounded font-mono text-zinc-500">
              {activePrinter ? activePrinter.paperWidth : '80mm'}
            </span>
            {onOpenPrinterSettings && (
              <button
                type="button"
                onClick={onOpenPrinterSettings}
                className="text-[11px] font-bold text-black hover:underline ml-1"
              >
                Tukar
              </button>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-zinc-200 rounded-xl font-bold uppercase tracking-widest text-xs text-zinc-600 hover:bg-zinc-100"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={!isValidForFormat()}
              onClick={handleDownloadImage}
              className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Download size={14} />
              PNG
            </button>
            <button
              type="button"
              disabled={!isValidForFormat()}
              onClick={handlePrint}
              className="px-4 py-2.5 bg-black text-white hover:bg-zinc-800 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-black/20 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Printer size={14} />
              Cetak Pelekat
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
