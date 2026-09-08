import React, { useRef } from 'react';
import { Printer as PrinterIcon, CheckCircle2, X, Settings2 } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { CartItem, Customer, ConnectedPrinter } from '../types';

interface ReceiptModalProps {
  saleId: number;
  items: CartItem[];
  totalAmount: number;
  discount: number;
  paymentMethod: string;
  customer?: Customer | null;
  cashierName: string;
  pointsEarned: number;
  pointsRedeemed: number;
  activePrinter?: ConnectedPrinter | null;
  onOpenPrinterSettings?: () => void;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  saleId,
  items,
  totalAmount,
  discount,
  paymentMethod,
  customer,
  cashierName,
  pointsEarned,
  pointsRedeemed,
  activePrinter,
  onOpenPrinterSettings,
  onClose,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const is58mm = activePrinter?.paperWidth === '58mm';
  const paperSize = is58mm ? '58mm auto' : '80mm auto';
  const paperWidthStyle = is58mm ? 'max-w-[260px] text-[11px]' : 'max-w-sm text-xs';

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('about:blank', '_blank', 'width=450,height=650');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Resit Pembelian #${saleId}</title>
          <style>
            @page { size: ${paperSize}; margin: ${is58mm ? '2mm' : '4mm'}; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              font-size: ${is58mm ? '10px' : '12px'}; 
              color: #000;
              margin: 0;
              padding: ${is58mm ? '4px' : '8px'};
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; }
            .title { font-size: ${is58mm ? '13px' : '15px'}; font-weight: bold; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
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
        className={`bg-white rounded-3xl shadow-2xl w-full ${paperWidthStyle} overflow-hidden flex flex-col max-h-[92vh]`}
      >
        {/* Top Header */}
        <div className="p-3.5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Jualan Selesai</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-200 rounded-full">
            <X size={16} />
          </button>
        </div>

        {/* Printer Selector Bar */}
        <div className="px-4 py-2 bg-zinc-100/70 border-b border-zinc-200/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-zinc-700 truncate pr-2">
            <PrinterIcon size={14} className="text-zinc-500 shrink-0" />
            <span className="font-medium truncate">
              {activePrinter ? activePrinter.name : 'Pencetak Sistem'}
            </span>
            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-white border border-zinc-200 rounded text-zinc-500 shrink-0">
              {activePrinter ? activePrinter.paperWidth : '80mm'}
            </span>
          </div>
          {onOpenPrinterSettings && (
            <button
              onClick={onOpenPrinterSettings}
              className="text-[11px] font-bold text-black hover:underline flex items-center gap-1 shrink-0"
            >
              <Settings2 size={12} />
              Tukar
            </button>
          )}
        </div>

        {/* Printable Receipt Container */}
        <div className="p-5 overflow-y-auto flex-1 bg-white font-mono text-xs">
          <div ref={receiptRef} className="space-y-3">
            <div className="text-center">
              <h2 className="text-sm font-bold tracking-tight">KEDAI RUNCIT & POS</h2>
              <p className="text-[10px] text-zinc-500">RazifApps POS & Monitor Suite @ Nasadef™</p>
              <p className="text-[9px] text-zinc-400 mt-0.5">Watermark: RazifApps@Nasadef™</p>
            </div>

            <div className="border-b border-dashed border-zinc-300 pb-2 text-[11px] text-zinc-600 space-y-0.5">
              <div className="flex justify-between">
                <span>No. Resit:</span>
                <span className="font-bold">#{saleId}</span>
              </div>
              <div className="flex justify-between">
                <span>Tarikh:</span>
                <span>{format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
              </div>
              <div className="flex justify-between">
                <span>Juruwang:</span>
                <span>{cashierName}</span>
              </div>
              {customer && (
                <div className="flex justify-between pt-1 font-semibold text-black">
                  <span>Pelanggan:</span>
                  <span>{customer.name}</span>
                </div>
              )}
            </div>

            {/* Items list */}
            <div className="space-y-1.5 py-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <div className="flex-1 pr-2">
                    <p className="font-bold">{item.name}</p>
                    <p className="text-[10px] text-zinc-500">{item.quantity} × RM {item.sell_price.toFixed(2)}</p>
                  </div>
                  <span className="font-bold">RM {(item.sell_price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-dashed border-zinc-300 pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subjumlah:</span>
                <span>RM {(totalAmount + discount).toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskaun:</span>
                  <span>- RM {discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-zinc-200">
                <span>JUMLAH:</span>
                <span>RM {totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span>Kaedah Bayaran:</span>
                <span className="uppercase font-bold">{paymentMethod}</span>
              </div>
            </div>

            {/* Loyalty points info */}
            {customer && (
              <div className="border-t border-dashed border-zinc-300 pt-2 text-[10px] text-zinc-600 space-y-0.5 bg-zinc-50 p-2 rounded-lg">
                <p className="font-bold uppercase tracking-wider text-black">Mata Kesetiaan</p>
                {pointsRedeemed > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Mata Ditebus:</span>
                    <span>-{pointsRedeemed} pts</span>
                  </div>
                )}
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Mata Diperoleh:</span>
                  <span>+{pointsEarned} pts</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-zinc-200 font-bold">
                  <span>Baki Mata Semasa:</span>
                  <span>{Math.max(0, (customer.points || 0) - pointsRedeemed + pointsEarned)} pts</span>
                </div>
              </div>
            )}

            <div className="text-center pt-3 text-[10px] text-zinc-400">
              <p>*** Terima Kasih & Sila Datang Lagi ***</p>
              <p className="mt-1">RazifApps@Nasadef™</p>
              {activePrinter && (
                <p className="text-[8px] text-zinc-300 mt-0.5 font-mono">
                  Dicetak ke: {activePrinter.name} ({activePrinter.paperWidth})
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-zinc-200 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-zinc-100"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-black text-white rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-lg shadow-black/20 hover:bg-zinc-800"
          >
            <PrinterIcon size={15} />
            Cetak Resit
          </button>
        </div>
      </motion.div>
    </div>
  );
};
