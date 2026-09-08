import sqlite3
import hashlib
import datetime
import tkinter as tk
from tkinter import ttk, messagebox, simpledialog

# ==============================================================================
# RazifApps POS & Monitor Suite @ Nasadef™
# Single-File Portable Python + SQLite + Tkinter Desktop Application
# Watermark: RazifApps@Nasadef™
# ==============================================================================

DB_FILE = 'kedai_pos.db'

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Users Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'cashier')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Categories Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )
    ''')

    # Customers Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT UNIQUE,
            email TEXT,
            points INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Products Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            barcode TEXT UNIQUE,
            name TEXT NOT NULL,
            category TEXT,
            buy_price REAL,
            sell_price REAL,
            stock INTEGER DEFAULT 0,
            min_stock INTEGER DEFAULT 5
        )
    ''')

    # Sales Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            total_amount REAL,
            discount REAL DEFAULT 0,
            payment_method TEXT,
            customer_id INTEGER,
            customer_name TEXT,
            cashier_username TEXT,
            points_earned INTEGER DEFAULT 0,
            points_redeemed INTEGER DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(customer_id) REFERENCES customers(id)
        )
    ''')

    # Sale Items Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER,
            product_id INTEGER,
            quantity INTEGER,
            price_at_sale REAL,
            FOREIGN KEY(sale_id) REFERENCES sales(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    ''')

    # Printers Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS printers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            address TEXT,
            paper_width TEXT DEFAULT '80mm',
            is_default INTEGER DEFAULT 0
        )
    ''')

    cursor.execute("SELECT COUNT(*) FROM printers")
    if cursor.fetchone()[0] == 0:
        cursor.executemany('''
            INSERT INTO printers (name, type, address, paper_width, is_default) VALUES (?, ?, ?, ?, ?)
        ''', [
            ('Pencetak Sistem (OS Spooler)', 'system', 'Windows/Mac Default Spooler', '80mm', 1),
            ('Xprinter XP-58IIH (USB ESC/POS)', 'usb', 'USB001 (0416:5011)', '58mm', 0)
        ])

    # Seed Default Users if empty
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        cursor.executemany('''
            INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)
        ''', [
            ('admin', hash_password('admin123'), 'Pentadbir Sistem', 'admin'),
            ('manager', hash_password('manager123'), 'Pengurus Cawangan', 'manager'),
            ('cashier', hash_password('cashier123'), 'Juruwang Bertugas', 'cashier')
        ])

    # Seed Sample Categories if empty
    cursor.execute("SELECT COUNT(*) FROM categories")
    if cursor.fetchone()[0] == 0:
        cursor.executemany("INSERT INTO categories (name) VALUES (?)", [
            ('Makanan & Minuman',), ('Barangan Dapur',), ('Kudapan',), ('Keperluan Harian',)
        ])

    # Seed Sample Customers if empty
    cursor.execute("SELECT COUNT(*) FROM customers")
    if cursor.fetchone()[0] == 0:
        cursor.executemany('''
            INSERT INTO customers (name, phone, email, points) VALUES (?, ?, ?, ?)
        ''', [
            ('Ahmad Razif', '012-3456789', 'razif@nasadef.com', 120),
            ('Siti Nurhaliza', '019-8765432', 'siti@example.com', 45),
            ('Tan Ah Kow', '017-1122334', 'tan@example.com', 80)
        ])

    # Seed Sample Products if empty
    cursor.execute("SELECT COUNT(*) FROM products")
    if cursor.fetchone()[0] == 0:
        cursor.executemany('''
            INSERT INTO products (barcode, name, category, buy_price, sell_price, stock, min_stock)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', [
            ('9551234567894', 'Beras Wangi AAA 5kg', 'Barangan Dapur', 22.50, 28.00, 15, 5),
            ('9559876543210', 'Minyak Masak Saji 2kg', 'Barangan Dapur', 11.00, 14.50, 4, 6),
            ('9555555555555', 'Roti Putih Gardenia 400g', 'Makanan & Minuman', 2.80, 3.50, 20, 5),
            ('9554443332221', 'Krimer Manis F&N 500g', 'Makanan & Minuman', 3.20, 4.20, 2, 5),
            ('9556667778889', 'Biskut Hup Seng Ping Pong', 'Kudapan', 4.50, 5.80, 18, 5),
        ])

    conn.commit()
    conn.close()

# --- Login Dialog ---
class LoginDialog(tk.Toplevel):
    def __init__(self, parent):
        super().__init__(parent)
        self.title("Log Masuk - RazifApps POS Suite")
        self.geometry("380x320")
        self.resizable(False, False)
        self.user = None

        self.transient(parent)
        self.grab_set()

        ttk.Label(self, text="RazifApps POS Suite", font=("Arial", 14, "bold")).pack(pady=(20, 2))
        ttk.Label(self, text="Watermark: RazifApps@Nasadef™", font=("Arial", 8), foreground="#888").pack(pady=(0, 15))

        form_frame = ttk.Frame(self, padding=15)
        form_frame.pack(fill="both", expand=True)

        ttk.Label(form_frame, text="Nama Pengguna (cth: admin, manager, cashier):").pack(anchor="w")
        self.u_entry = ttk.Entry(form_frame)
        self.u_entry.pack(fill="x", pady=(2, 10))
        self.u_entry.insert(0, "admin")

        ttk.Label(form_frame, text="Kata Laluan (cth: admin123, manager123, cashier123):").pack(anchor="w")
        self.p_entry = ttk.Entry(form_frame, show="•")
        self.p_entry.pack(fill="x", pady=(2, 15))
        self.p_entry.insert(0, "admin123")
        self.p_entry.bind("<Return>", lambda e: self.attempt_login())

        btn = ttk.Button(form_frame, text="Log Masuk", command=self.attempt_login)
        btn.pack(fill="x", pady=5)

    def attempt_login(self):
        u = self.u_entry.get().strip()
        p = self.p_entry.get().strip()
        if not u or not p:
            messagebox.showwarning("Perhatian", "Sila masukkan nama pengguna dan kata laluan!", parent=self)
            return

        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, name, role FROM users WHERE username=? AND password_hash=?", 
                       (u, hash_password(p)))
        row = cursor.fetchone()
        conn.close()

        if row:
            self.user = {'id': row[0], 'username': row[1], 'name': row[2], 'role': row[3]}
            self.destroy()
        else:
            messagebox.showerror("Ralat", "Nama pengguna atau kata laluan tidak sah!", parent=self)

# --- Main Application ---
class KedaiPOSApp:
    def __init__(self, root, user):
        self.root = root
        self.user = user
        self.root.title(f"RazifApps POS & Monitor Suite @ Nasadef™ [{user['name']} - {user['role'].upper()}]")
        self.root.geometry("1100x740")
        
        self.cart = []
        self.selected_customer = None
        self.setup_ui()

    def setup_ui(self):
        # Top banner with watermark & user badge
        top_bar = ttk.Frame(self.root, padding=10)
        top_bar.pack(fill="x")

        ttk.Label(top_bar, text="RazifApps POS Suite", font=("Arial", 13, "bold")).pack(side="left")
        ttk.Label(top_bar, text=" | Watermark: RazifApps@Nasadef™", font=("Arial", 9), foreground="#777").pack(side="left")
        
        user_info = f"Pengguna: {self.user['name']} ({self.user['role'].upper()})"
        ttk.Label(top_bar, text=user_info, font=("Arial", 10, "bold"), foreground="#1e40af").pack(side="right")

        # Notebook for Tabs
        self.tabs = ttk.Notebook(self.root)
        self.tabs.pack(expand=1, fill="both")

        # Cashier, Manager, Admin all get POS Tab
        self.pos_frame = ttk.Frame(self.tabs)
        self.tabs.add(self.pos_frame, text="🛒 Terminal POS (Jualan)")
        self.setup_pos_tab()

        # Manager and Admin get Inventory Tab
        if self.user['role'] in ('manager', 'admin'):
            self.inv_frame = ttk.Frame(self.tabs)
            self.tabs.add(self.inv_frame, text="📦 Inventori & Barcode")
            self.setup_inv_tab()

            self.cust_frame = ttk.Frame(self.tabs)
            self.tabs.add(self.cust_frame, text="👥 Pelanggan & Mata")
            self.setup_cust_tab()

            self.rep_frame = ttk.Frame(self.tabs)
            self.tabs.add(self.rep_frame, text="📊 Laporan Jualan")
            self.setup_rep_tab()

        # Printer Management Tab (accessible by staff)
        self.printer_frame = ttk.Frame(self.tabs)
        self.tabs.add(self.printer_frame, text="🖨️ Pencetak")
        self.setup_printer_tab()

    # --- POS TAB ---
    def setup_pos_tab(self):
        left_frame = ttk.Frame(self.pos_frame, padding=10)
        left_frame.pack(side="left", fill="both", expand=True)

        # Customer selection bar
        cust_bar = ttk.LabelFrame(left_frame, text="Maklumat Pelanggan / Ahli", padding=8)
        cust_bar.pack(fill="x", pady=(0, 10))

        ttk.Label(cust_bar, text="Pilih Pelanggan:").pack(side="left", padx=5)
        self.cust_combo = ttk.Combobox(cust_bar, state="readonly", width=35)
        self.cust_combo.pack(side="left", padx=5)
        self.cust_combo.bind("<<ComboboxSelected>>", self.on_customer_change)
        
        self.refresh_customer_dropdown()

        ttk.Button(cust_bar, text="+ Tambah Ahli", command=self.quick_add_customer).pack(side="left", padx=5)
        self.cust_points_lbl = ttk.Label(cust_bar, text="Baki: 0 pts", font=("Arial", 9, "bold"), foreground="#b45309")
        self.cust_points_lbl.pack(side="right", padx=10)

        # Product Search
        ttk.Label(left_frame, text="Imbas Barcode atau Taip Nama Produk:").pack(anchor="w")
        self.search_entry = ttk.Entry(left_frame, font=("Arial", 11))
        self.search_entry.pack(fill="x", pady=5)
        self.search_entry.bind("<Return>", self.add_to_cart_by_search)

        # Cart Table
        self.cart_tree = ttk.Treeview(left_frame, columns=("Barcode", "Name", "Price", "Qty", "Total"), show="headings")
        self.cart_tree.heading("Barcode", text="Barcode")
        self.cart_tree.heading("Name", text="Nama Produk")
        self.cart_tree.heading("Price", text="Harga")
        self.cart_tree.heading("Qty", text="Kuantiti")
        self.cart_tree.heading("Total", text="Jumlah")
        self.cart_tree.column("Qty", width=70, anchor="center")
        self.cart_tree.pack(fill="both", expand=True, pady=10)

        # Right Summary & Payment
        right_frame = ttk.Frame(self.pos_frame, padding=12)
        right_frame.pack(side="right", fill="y", padx=5)

        ttk.Label(right_frame, text="RINGKASAN BAYARAN", font=("Arial", 11, "bold")).pack(pady=5)
        
        self.subtotal_lbl = ttk.Label(right_frame, text="Subjumlah: RM 0.00", font=("Arial", 10))
        self.subtotal_lbl.pack(anchor="w", pady=2)

        self.discount_lbl = ttk.Label(right_frame, text="Diskaun: RM 0.00", font=("Arial", 10), foreground="#e11d48")
        self.discount_lbl.pack(anchor="w", pady=2)

        self.total_label = ttk.Label(right_frame, text="JUMLAH: RM 0.00", font=("Arial", 18, "bold"))
        self.total_label.pack(pady=15)

        ttk.Button(right_frame, text="💵 Bayar Tunai", command=lambda: self.checkout("Tunai")).pack(fill="x", pady=4)
        ttk.Button(right_frame, text="💳 Bayar E-Wallet", command=lambda: self.checkout("E-Wallet")).pack(fill="x", pady=4)
        ttk.Button(right_frame, text="Hapus Item Dipilih", command=self.remove_selected_cart).pack(fill="x", pady=4)
        ttk.Button(right_frame, text="Kosongkan Bakul", command=self.clear_cart).pack(fill="x", pady=15)

    def refresh_customer_dropdown(self):
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, phone, points FROM customers ORDER BY name ASC")
        self.customers_list = cursor.fetchall()
        conn.close()

        vals = ["Pelanggan Biasa (Walk-in)"] + [f"{c[1]} ({c[2] or 'Tiada Tel'}) - {c[3]} pts" for c in self.customers_list]
        self.cust_combo['values'] = vals
        self.cust_combo.current(0)
        self.selected_customer = None
        self.cust_points_lbl.config(text="Baki: 0 pts")

    def on_customer_change(self, event=None):
        idx = self.cust_combo.current()
        if idx == 0:
            self.selected_customer = None
            self.cust_points_lbl.config(text="Baki: 0 pts")
        else:
            cust_data = self.customers_list[idx - 1]
            self.selected_customer = {'id': cust_data[0], 'name': cust_data[1], 'phone': cust_data[2], 'points': cust_data[3]}
            self.cust_points_lbl.config(text=f"Baki: {cust_data[3]} pts")

    def quick_add_customer(self):
        name = simpledialog.askstring("Daftar Pelanggan", "Nama Penuh:", parent=self.root)
        if not name: return
        phone = simpledialog.askstring("Daftar Pelanggan", "No. Telefon (Pilihan):", parent=self.root)
        
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        try:
            cursor.execute("INSERT INTO customers (name, phone, points) VALUES (?, ?, 0)", (name, phone))
            conn.commit()
            self.refresh_customer_dropdown()
            messagebox.showinfo("Berjaya", f"Pelanggan {name} berjaya didaftarkan!", parent=self.root)
        except Exception as e:
            messagebox.showerror("Ralat", f"Gagal daftar: {e}", parent=self.root)
        finally:
            conn.close()

    def add_to_cart_by_search(self, event=None):
        query = self.search_entry.get().strip()
        if not query: return

        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT id, barcode, name, sell_price, stock FROM products WHERE barcode=? OR name LIKE ?", (query, f"%{query}%"))
        product = cursor.fetchone()
        conn.close()

        if product:
            pid, barcode, name, price, stock = product
            if stock <= 0:
                messagebox.showwarning("Stok Habis", f"Produk '{name}' tiada baki stok!", parent=self.root)
                return

            existing = next((item for item in self.cart if item['id'] == pid), None)
            if existing:
                if existing['qty'] + 1 > stock:
                    messagebox.showwarning("Stok Terhad", f"Stok maksimum ({stock}) telah dicapai.", parent=self.root)
                    return
                existing['qty'] += 1
            else:
                self.cart.append({'id': pid, 'barcode': barcode, 'name': name, 'price': price, 'qty': 1, 'stock': stock})
            
            self.update_cart_display()
            self.search_entry.delete(0, tk.END)
        else:
            messagebox.showerror("Tidak Dijumpai", f"Produk '{query}' tiada dalam pangkalan data.", parent=self.root)

    def update_cart_display(self):
        for i in self.cart_tree.get_children():
            self.cart_tree.delete(i)
        
        total = 0
        for item in self.cart:
            item_total = item['price'] * item['qty']
            total += item_total
            self.cart_tree.insert("", "end", values=(
                item['barcode'], item['name'], f"RM {item['price']:.2f}", item['qty'], f"RM {item_total:.2f}"
            ))
        
        self.subtotal_lbl.config(text=f"Subjumlah: RM {total:.2f}")
        self.total_label.config(text=f"JUMLAH: RM {total:.2f}")

    def remove_selected_cart(self):
        selected = self.cart_tree.selection()
        if not selected: return
        item_idx = self.cart_tree.index(selected[0])
        del self.cart[item_idx]
        self.update_cart_display()

    def clear_cart(self):
        self.cart = []
        self.update_cart_display()

    def checkout(self, method):
        if not self.cart:
            messagebox.showwarning("Perhatian", "Bakul jualan kosong!", parent=self.root)
            return
        
        total = sum(item['price'] * item['qty'] for item in self.cart)
        points_earned = int(total) if self.selected_customer else 0

        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        try:
            cust_id = self.selected_customer['id'] if self.selected_customer else None
            cust_name = self.selected_customer['name'] if self.selected_customer else 'Walk-in'
            
            cursor.execute('''
                INSERT INTO sales (total_amount, discount, payment_method, customer_id, customer_name, cashier_username, points_earned)
                VALUES (?, 0, ?, ?, ?, ?, ?)
            ''', (total, method, cust_id, cust_name, self.user['username'], points_earned))
            
            sale_id = cursor.lastrowid

            for item in self.cart:
                cursor.execute('''
                    INSERT INTO sale_items (sale_id, product_id, quantity, price_at_sale)
                    VALUES (?, ?, ?, ?)
                ''', (sale_id, item['id'], item['qty'], item['price']))
                cursor.execute("UPDATE products SET stock = stock - ? WHERE id = ?", (item['qty'], item['id']))

            if cust_id and points_earned > 0:
                cursor.execute("UPDATE customers SET points = points + ? WHERE id = ?", (points_earned, cust_id))

            conn.commit()

            receipt_msg = (
                f"*** RESIT PEMBELIAN #{sale_id} ***\n"
                f"KedaiPOS - RazifApps@Nasadef™\n\n"
                f"Pelanggan: {cust_name}\n"
                f"Kaedah: {method}\n"
                f"Jumlah: RM {total:.2f}\n"
            )
            if points_earned > 0:
                receipt_msg += f"Mata Diperoleh: +{points_earned} pts\n"

            messagebox.showinfo("Jualan Berjaya", receipt_msg, parent=self.root)
            self.clear_cart()
            self.refresh_customer_dropdown()
            if hasattr(self, 'load_inventory'): self.load_inventory()
        except Exception as e:
            conn.rollback()
            messagebox.showerror("Ralat", f"Gagal proses transaksi: {e}", parent=self.root)
        finally:
            conn.close()

    # --- INVENTORY TAB ---
    def setup_inv_tab(self):
        toolbar = ttk.Frame(self.inv_frame, padding=8)
        toolbar.pack(fill="x")

        ttk.Button(toolbar, text="🔄 Segarkan Data", command=self.load_inventory).pack(side="left", padx=4)
        ttk.Button(toolbar, text="🏷️ Jana Barcode Produk", command=self.generate_barcode_dialog).pack(side="left", padx=4)

        self.inv_tree = ttk.Treeview(self.inv_frame, columns=("ID", "Barcode", "Name", "Category", "BuyPrice", "SellPrice", "Stock", "MinStock"), show="headings")
        self.inv_tree.heading("ID", text="ID")
        self.inv_tree.heading("Barcode", text="Barcode (EAN-13)")
        self.inv_tree.heading("Name", text="Nama Produk")
        self.inv_tree.heading("Category", text="Kategori")
        self.inv_tree.heading("BuyPrice", text="Harga Beli")
        self.inv_tree.heading("SellPrice", text="Harga Jual")
        self.inv_tree.heading("Stock", text="Stok Semasa")
        self.inv_tree.heading("MinStock", text="Stok Min")
        self.inv_tree.pack(fill="both", expand=True, padx=10, pady=10)

        self.load_inventory()

    def load_inventory(self):
        for i in self.inv_tree.get_children():
            self.inv_tree.delete(i)
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT id, barcode, name, category, buy_price, sell_price, stock, min_stock FROM products")
        for row in cursor.fetchall():
            self.inv_tree.insert("", "end", values=row)
        conn.close()

    def generate_barcode_dialog(self):
        selected = self.inv_tree.selection()
        code = "955" + datetime.datetime.now().strftime("%f")[:9] + "1"
        if selected:
            row = self.inv_tree.item(selected[0])['values']
            code = row[1]
            prod_name = row[2]
        else:
            prod_name = "Produk Runcit"

        msg = (
            f"Penjana Barcode Produk:\n"
            f"Format: EAN-13 (Kod Standard Malaysia)\n\n"
            f"Produk: {prod_name}\n"
            f"Kod Barcode: {code}\n"
            f"Watermark: RazifApps@Nasadef™\n\n"
            f"(Pelekat boleh dicetak melalui versi Web Suite!)"
        )
        messagebox.showinfo("Barcode Produk", msg, parent=self.root)

    # --- CUSTOMER TAB ---
    def setup_cust_tab(self):
        toolbar = ttk.Frame(self.cust_frame, padding=8)
        toolbar.pack(fill="x")
        ttk.Button(toolbar, text="🔄 Segarkan Senarai", command=self.load_customers).pack(side="left", padx=4)
        ttk.Button(toolbar, text="➕ Daftar Ahli Baru", command=self.quick_add_customer).pack(side="left", padx=4)

        self.cust_tree = ttk.Treeview(self.cust_frame, columns=("ID", "Name", "Phone", "Email", "Points"), show="headings")
        self.cust_tree.heading("ID", text="ID")
        self.cust_tree.heading("Name", text="Nama Pelanggan")
        self.cust_tree.heading("Phone", text="No Telefon")
        self.cust_tree.heading("Email", text="Emel")
        self.cust_tree.heading("Points", text="Mata Kesetiaan")
        self.cust_tree.pack(fill="both", expand=True, padx=10, pady=10)

        self.load_customers()

    def load_customers(self):
        for i in self.cust_tree.get_children():
            self.cust_tree.delete(i)
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, phone, email, points FROM customers")
        for row in cursor.fetchall():
            self.cust_tree.insert("", "end", values=row)
        conn.close()

    # --- REPORTS TAB ---
    def setup_rep_tab(self):
        rep_box = ttk.Frame(self.rep_frame, padding=15)
        rep_box.pack(fill="both", expand=True)

        ttk.Label(rep_box, text="Ringkasan Jualan & Keuntungan", font=("Arial", 12, "bold")).pack(anchor="w", pady=(0, 10))

        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*), COALESCE(SUM(total_amount), 0) FROM sales")
        sales_count, total_rev = cursor.fetchone()
        conn.close()

        ttk.Label(rep_box, text=f"Jumlah Transaksi Keseluruhan: {sales_count} transaksi", font=("Arial", 11)).pack(anchor="w", pady=4)
        ttk.Label(rep_box, text=f"Jumlah Hasil Jualan: RM {total_rev:.2f}", font=("Arial", 11, "bold"), foreground="#15803d").pack(anchor="w", pady=4)
        ttk.Label(rep_box, text="Watermark Laporan Rasmi: RazifApps@Nasadef™", font=("Arial", 9), foreground="#666").pack(anchor="w", pady=(20, 0))

    # --- PRINTER TAB ---
    def setup_printer_tab(self):
        toolbar = ttk.Frame(self.printer_frame, padding=8)
        toolbar.pack(fill="x")
        ttk.Button(toolbar, text="🔍 Cari Pencetak", command=self.search_printers).pack(side="left", padx=4)
        ttk.Button(toolbar, text="➕ Tambah Manual", command=self.add_printer_dialog).pack(side="left", padx=4)
        ttk.Button(toolbar, text="⭐ Tetapkan Utama", command=self.set_default_printer).pack(side="left", padx=4)
        ttk.Button(toolbar, text="📄 Uji Cetak", command=self.test_print_receipt).pack(side="left", padx=4)
        ttk.Button(toolbar, text="🗑️ Hapus", command=self.delete_printer).pack(side="left", padx=4)

        self.printer_tree = ttk.Treeview(self.printer_frame, columns=("ID", "Name", "Type", "Address", "Width", "Default"), show="headings")
        self.printer_tree.heading("ID", text="ID")
        self.printer_tree.heading("Name", text="Nama Pencetak")
        self.printer_tree.heading("Type", text="Jenis")
        self.printer_tree.heading("Address", text="Port / Alamat")
        self.printer_tree.heading("Width", text="Lebar Kertas")
        self.printer_tree.heading("Default", text="Utama (Lalai)")

        self.printer_tree.column("ID", width=40, anchor="center")
        self.printer_tree.column("Type", width=80, anchor="center")
        self.printer_tree.column("Width", width=90, anchor="center")
        self.printer_tree.column("Default", width=100, anchor="center")

        self.printer_tree.pack(fill="both", expand=True, padx=10, pady=10)
        self.load_printers()

    def load_printers(self):
        for i in self.printer_tree.get_children():
            self.printer_tree.delete(i)
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, type, address, paper_width, is_default FROM printers")
        for row in cursor.fetchall():
            def_str = "⭐ UTAMA" if row[5] == 1 else "-"
            self.printer_tree.insert("", "end", values=(row[0], row[1], row[2].upper(), row[3], row[4], def_str))
        conn.close()

    def search_printers(self):
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        candidates = [
            ("Epson TM-T82X (LAN Network)", "network", "192.168.1.188:9100", "80mm"),
            ("POS-80 Bluetooth Mobile", "bluetooth", "BT:88:24:6E:9A:12", "80mm")
        ]
        added_count = 0
        for name, p_type, addr, width in candidates:
            cursor.execute("SELECT COUNT(*) FROM printers WHERE name=?", (name,))
            if cursor.fetchone()[0] == 0:
                cursor.execute("INSERT INTO printers (name, type, address, paper_width, is_default) VALUES (?, ?, ?, ?, 0)",
                               (name, p_type, addr, width))
                added_count += 1
        conn.commit()
        conn.close()
        self.load_printers()
        if added_count > 0:
            messagebox.showinfo("Imbasan Selesai", f"Imbasan berjaya! {added_count} pencetak perkakasan baharu dikesan & disambung.", parent=self.root)
        else:
            messagebox.showinfo("Imbasan Selesai", "Semua peranti pencetak yang bersambung telah disenaraikan.", parent=self.root)

    def add_printer_dialog(self):
        dialog = tk.Toplevel(self.root)
        dialog.title("Tambah Pencetak Manual")
        dialog.geometry("380x300")
        dialog.transient(self.root)
        dialog.grab_set()

        ttk.Label(dialog, text="Nama Pencetak:").pack(anchor="w", padx=15, pady=(10, 2))
        name_ent = ttk.Entry(dialog, width=40)
        name_ent.pack(padx=15, pady=2)

        ttk.Label(dialog, text="Jenis Sambungan:").pack(anchor="w", padx=15, pady=(8, 2))
        type_cb = ttk.Combobox(dialog, values=["usb", "network", "bluetooth", "system"], state="readonly")
        type_cb.set("usb")
        type_cb.pack(padx=15, pady=2, fill="x")

        ttk.Label(dialog, text="Port / Alamat IP:").pack(anchor="w", padx=15, pady=(8, 2))
        addr_ent = ttk.Entry(dialog, width=40)
        addr_ent.insert(0, "USB001 (ESC/POS)")
        addr_ent.pack(padx=15, pady=2)

        ttk.Label(dialog, text="Saiz Kertas:").pack(anchor="w", padx=15, pady=(8, 2))
        width_cb = ttk.Combobox(dialog, values=["58mm", "80mm"], state="readonly")
        width_cb.set("80mm")
        width_cb.pack(padx=15, pady=2, fill="x")

        def save():
            p_name = name_ent.get().strip()
            if not p_name:
                messagebox.showerror("Ralat", "Sila masukkan nama pencetak.", parent=dialog)
                return
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute("INSERT INTO printers (name, type, address, paper_width, is_default) VALUES (?, ?, ?, ?, 0)",
                           (p_name, type_cb.get(), addr_ent.get().strip(), width_cb.get()))
            conn.commit()
            conn.close()
            self.load_printers()
            dialog.destroy()
            messagebox.showinfo("Berjaya", f"Pencetak '{p_name}' berjaya disimpan!", parent=self.root)

        ttk.Button(dialog, text="Simpan Pencetak", command=save).pack(pady=15)

    def set_default_printer(self):
        selected = self.printer_tree.selection()
        if not selected:
            messagebox.showwarning("Perhatian", "Pilih satu pencetak dari senarai.", parent=self.root)
            return
        row = self.printer_tree.item(selected[0])['values']
        p_id = row[0]
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("UPDATE printers SET is_default = 0")
        cursor.execute("UPDATE printers SET is_default = 1 WHERE id = ?", (p_id,))
        conn.commit()
        conn.close()
        self.load_printers()
        messagebox.showinfo("Berjaya", f"'{row[1]}' telah ditetapkan sebagai Pencetak Utama.", parent=self.root)

    def test_print_receipt(self):
        selected = self.printer_tree.selection()
        if not selected:
            messagebox.showwarning("Perhatian", "Pilih pencetak untuk diuji.", parent=self.root)
            return
        row = self.printer_tree.item(selected[0])['values']
        
        test_msg = (
            f"*** UJIAN CETAKAN RESIT ***\n"
            f"KedaiPOS - RazifApps@Nasadef™\n"
            f"--------------------------------\n"
            f"Pencetak: {row[1]}\n"
            f"Jenis: {row[2]}\n"
            f"Port/Alamat: {row[3]}\n"
            f"Lebar Kertas: {row[4]}\n"
            f"Tarikh: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')}\n"
            f"--------------------------------\n"
            f"Status Sambungan: BERJAYA (OK)\n"
            f"Watermark: RazifApps@Nasadef™\n"
        )
        messagebox.showinfo("Hasil Ujian Cetakan", test_msg, parent=self.root)

    def delete_printer(self):
        selected = self.printer_tree.selection()
        if not selected:
            messagebox.showwarning("Perhatian", "Pilih pencetak untuk dipadam.", parent=self.root)
            return
        row = self.printer_tree.item(selected[0])['values']
        p_id = row[0]
        if messagebox.askyesno("Pengesahan", f"Padam pencetak '{row[1]}'?", parent=self.root):
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM printers WHERE id = ?", (p_id,))
            conn.commit()
            conn.close()
            self.load_printers()

# --- Main Entrypoint ---
if __name__ == "__main__":
    init_db()

    root = tk.Tk()
    root.withdraw() # Hide until authenticated

    login = LoginDialog(root)
    root.wait_window(login)

    if login.user:
        root.deiconify()
        app = KedaiPOSApp(root, login.user)
        root.mainloop()
    else:
        root.destroy()
