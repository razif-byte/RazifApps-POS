import express from "express";
import path from "path";
import cors from "cors";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
// Using built-in Node 22 SQLite (DatabaseSync) to guarantee compatibility across all environments
import { DatabaseSync } from "node:sqlite";

const app = express();
const PORT = 3000;
const DB_PATH = path.join(process.cwd(), "kedai_pos.db");

app.use(cors());
app.use(express.json());

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Initialize SQLite Database
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys for high performance and integrity
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'cashier')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    email TEXT,
    points INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    buy_price REAL,
    sell_price REAL,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5
  );

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
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price_at_sale REAL,
    FOREIGN KEY(sale_id) REFERENCES sales(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );
`);

// Safe migrations for sales table if already existed without new columns
const alterColumns = [
  "ALTER TABLE sales ADD COLUMN customer_id INTEGER",
  "ALTER TABLE sales ADD COLUMN customer_name TEXT",
  "ALTER TABLE sales ADD COLUMN cashier_username TEXT",
  "ALTER TABLE sales ADD COLUMN points_earned INTEGER DEFAULT 0",
  "ALTER TABLE sales ADD COLUMN points_redeemed INTEGER DEFAULT 0"
];
for (const sql of alterColumns) {
  try {
    db.exec(sql);
  } catch (e) {
    // Column already exists, safe to ignore
  }
}

// Seed Default Users if empty
const userCount = (db.prepare("SELECT count(*) as count FROM users").get() as any)?.count || 0;
if (userCount === 0) {
  const insertUser = db.prepare("INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)");
  insertUser.run("admin", hashPassword("admin123"), "Pengurus Utama (Admin)", "admin");
  insertUser.run("manager", hashPassword("manager123"), "Penyelia Kedai (Manager)", "manager");
  insertUser.run("cashier", hashPassword("cashier123"), "Juruwang Bertugas", "cashier");
  console.log("Seeded default users: admin, manager, cashier");
}

// Seed Default Customers if empty
const customerCount = (db.prepare("SELECT count(*) as count FROM customers").get() as any)?.count || 0;
if (customerCount === 0) {
  const insertCust = db.prepare("INSERT INTO customers (name, phone, email, points) VALUES (?, ?, ?, ?)");
  insertCust.run("Ahmad Razif", "012-3456789", "razif@nasadef.com", 150);
  insertCust.run("Siti Nurhaliza", "019-8765432", "siti@example.com", 85);
  insertCust.run("Tan Ah Kow", "017-1122334", "tan@example.com", 60);
  console.log("Seeded initial customers with loyalty points");
}

// Seed Default Categories if empty
const catCount = (db.prepare("SELECT count(*) as count FROM categories").get() as any)?.count || 0;
if (catCount === 0) {
  const insertCat = db.prepare("INSERT INTO categories (name) VALUES (?)");
  insertCat.run("Makanan");
  insertCat.run("Minuman");
  insertCat.run("Barangan Dapur");
  insertCat.run("Keperluan Harian");
}

// Seed Default Products if empty
const prodCount = (db.prepare("SELECT count(*) as count FROM products").get() as any)?.count || 0;
if (prodCount === 0) {
  const insertProd = db.prepare(
    "INSERT INTO products (barcode, name, category, buy_price, sell_price, stock, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  insertProd.run("9551234567894", "Beras Wangi AAA 5kg", "Barangan Dapur", 22.50, 28.00, 15, 5);
  insertProd.run("9559876543210", "Minyak Masak Saji 2kg", "Barangan Dapur", 11.00, 14.50, 4, 6);
  insertProd.run("9555555555555", "Roti Putih Gardenia 400g", "Makanan", 2.80, 3.50, 20, 5);
  insertProd.run("9554443332221", "Krimer Manis F&N 500g", "Minuman", 3.20, 4.20, 2, 5);
  insertProd.run("9556667778889", "Biskut Hup Seng Ping Pong", "Makanan", 4.50, 5.80, 18, 5);
}

// ================= API Routes =================

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// --- Auth Endpoints ---
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Sila masukkan nama pengguna dan kata laluan" });
  }

  const hashedPassword = hashPassword(password);
  try {
    const user = db.prepare(
      "SELECT id, username, name, role FROM users WHERE username = ? AND password_hash = ?"
    ).get(username.trim(), hashedPassword);

    if (!user) {
      return res.status(401).json({ error: "Nama pengguna atau kata laluan tidak tepat." });
    }
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// User Management (Admin only)
app.get("/api/users", (req, res) => {
  try {
    const rows = db.prepare("SELECT id, username, name, role, created_at FROM users ORDER BY id ASC").all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users", (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: "Semua medan pengguna diperlukan" });
  }
  const passwordHash = hashPassword(password);
  try {
    const result = db.prepare(
      "INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)"
    ).run(username.trim(), passwordHash, name.trim(), role);

    res.json({ id: Number(result.lastInsertRowid), username, name, role });
  } catch (err: any) {
    res.status(400).json({ error: "Nama pengguna telah digunakan atau ralat pangkalan data." });
  }
});

app.put("/api/users/:id", (req, res) => {
  const { name, role, password } = req.body;
  try {
    if (password && password.trim() !== "") {
      const passwordHash = hashPassword(password);
      const result = db.prepare(
        "UPDATE users SET name = ?, role = ?, password_hash = ? WHERE id = ?"
      ).run(name, role, passwordHash, req.params.id);
      res.json({ updated: Number(result.changes) });
    } else {
      const result = db.prepare(
        "UPDATE users SET name = ?, role = ? WHERE id = ?"
      ).run(name, role, req.params.id);
      res.json({ updated: Number(result.changes) });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/users/:id", (req, res) => {
  try {
    const result = db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ deleted: Number(result.changes) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Customer Endpoints ---
app.get("/api/customers", (req, res) => {
  try {
    const query = `
      SELECT c.*, 
        COUNT(s.id) as total_purchases, 
        COALESCE(SUM(s.total_amount), 0) as total_spent
      FROM customers c
      LEFT JOIN sales s ON s.customer_id = c.id
      GROUP BY c.id
      ORDER BY c.name ASC
    `;
    const rows = db.prepare(query).all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/customers/:id", (req, res) => {
  try {
    const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);
    if (!customer) return res.status(404).json({ error: "Pelanggan tidak dijumpai" });

    const salesQuery = `
      SELECT s.*,
        (SELECT json_group_array(json_object('name', p.name, 'quantity', si.quantity, 'price_at_sale', si.price_at_sale))
         FROM sale_items si 
         JOIN products p ON p.id = si.product_id 
         WHERE si.sale_id = s.id
        ) as items_json
      FROM sales s
      WHERE s.customer_id = ?
      ORDER BY s.timestamp DESC
    `;
    const salesRows = db.prepare(salesQuery).all(req.params.id);
    const parsedSales = (salesRows || []).map((row: any) => {
      try {
        return { ...row, items: JSON.parse(row.items_json || "[]") };
      } catch (e) {
        return { ...row, items: [] };
      }
    });

    res.json({ customer, transactions: parsedSales });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/customers", (req, res) => {
  const { name, phone, email } = req.body;
  if (!name) return res.status(400).json({ error: "Nama pelanggan diperlukan" });

  try {
    const result = db.prepare(
      "INSERT INTO customers (name, phone, email, points) VALUES (?, ?, ?, 0)"
    ).run(name.trim(), phone?.trim() || null, email?.trim() || null);

    res.json({ id: Number(result.lastInsertRowid), name, phone, email, points: 0 });
  } catch (err: any) {
    res.status(400).json({ error: "Nombor telefon telah didaftarkan atau ralat pangkalan data." });
  }
});

app.put("/api/customers/:id", (req, res) => {
  const { name, phone, email, points } = req.body;
  try {
    const result = db.prepare(
      "UPDATE customers SET name = ?, phone = ?, email = ?, points = ? WHERE id = ?"
    ).run(name, phone, email, points, req.params.id);
    res.json({ updated: Number(result.changes) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/customers/:id", (req, res) => {
  try {
    const result = db.prepare("DELETE FROM customers WHERE id = ?").run(req.params.id);
    res.json({ deleted: Number(result.changes) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Categories ---
app.get("/api/categories", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM categories ORDER BY name ASC").all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/categories", (req, res) => {
  const { name } = req.body;
  try {
    const result = db.prepare("INSERT INTO categories (name) VALUES (?)").run(name);
    res.json({ id: Number(result.lastInsertRowid) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/categories/:id", (req, res) => {
  const { name } = req.body;
  try {
    const result = db.prepare("UPDATE categories SET name=? WHERE id=?").run(name, req.params.id);
    res.json({ updated: Number(result.changes) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/categories/:id", (req, res) => {
  try {
    const result = db.prepare("DELETE FROM categories WHERE id=?").run(req.params.id);
    res.json({ deleted: Number(result.changes) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Products ---
app.get("/api/products", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM products ORDER BY name ASC").all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/products", (req, res) => {
  const { barcode, name, category, buy_price, sell_price, stock, min_stock } = req.body;
  try {
    const result = db.prepare(
      "INSERT INTO products (barcode, name, category, buy_price, sell_price, stock, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(barcode, name, category, buy_price, sell_price, stock, min_stock);
    res.json({ id: Number(result.lastInsertRowid) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", (req, res) => {
  const { barcode, name, category, buy_price, sell_price, stock, min_stock } = req.body;
  try {
    const result = db.prepare(
      "UPDATE products SET barcode=?, name=?, category=?, buy_price=?, sell_price=?, stock=?, min_stock=? WHERE id=?"
    ).run(barcode, name, category, buy_price, sell_price, stock, min_stock, req.params.id);
    res.json({ updated: Number(result.changes) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/products/:id", (req, res) => {
  try {
    const result = db.prepare("DELETE FROM products WHERE id=?").run(req.params.id);
    res.json({ deleted: Number(result.changes) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- POS Sales Transaction ---
app.post("/api/sales", (req, res) => {
  const { 
    items, 
    total_amount, 
    discount, 
    payment_method, 
    customer_id, 
    customer_name, 
    cashier_username,
    points_earned = 0,
    points_redeemed = 0 
  } = req.body;

  try {
    db.exec("BEGIN TRANSACTION");

    const insertSale = db.prepare(`
      INSERT INTO sales (
        total_amount, discount, payment_method, customer_id, customer_name, cashier_username, points_earned, points_redeemed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const saleRes = insertSale.run(
      total_amount, 
      discount, 
      payment_method, 
      customer_id || null, 
      customer_name || null, 
      cashier_username || "cashier",
      points_earned, 
      points_redeemed
    );
    const saleId = Number(saleRes.lastInsertRowid);

    const insertItem = db.prepare(
      "INSERT INTO sale_items (sale_id, product_id, quantity, price_at_sale) VALUES (?, ?, ?, ?)"
    );
    const updateStock = db.prepare(
      "UPDATE products SET stock = stock - ? WHERE id = ?"
    );

    for (const item of items) {
      insertItem.run(saleId, item.id, item.quantity, item.sell_price);
      updateStock.run(item.quantity, item.id);
    }

    // If customer selected, update their loyalty points
    if (customer_id) {
      const netPointsChange = Number(points_earned || 0) - Number(points_redeemed || 0);
      db.prepare(
        "UPDATE customers SET points = MAX(0, points + ?) WHERE id = ?"
      ).run(netPointsChange, customer_id);
    }

    db.exec("COMMIT");
    res.json({ saleId, points_earned, points_redeemed });
  } catch (err: any) {
    try {
      db.exec("ROLLBACK");
    } catch (_) {}
    res.status(500).json({ error: err.message });
  }
});

// Sales history
app.get("/api/sales", (req, res) => {
  try {
    const query = `
      SELECT s.*, 
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count
      FROM sales s
      ORDER BY s.timestamp DESC
      LIMIT 100
    `;
    const rows = db.prepare(query).all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reports
app.get("/api/reports/daily", (req, res) => {
  try {
    const query = `
      SELECT date(timestamp) as date, SUM(total_amount) as revenue, SUM(discount) as total_discount, COUNT(*) as transactions
      FROM sales
      GROUP BY date(timestamp)
      ORDER BY date DESC
      LIMIT 30
    `;
    const rows = db.prepare(query).all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/reports/top-products", (req, res) => {
  try {
    const query = `
      SELECT p.name, SUM(si.quantity) as total_sold
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 5
    `;
    const rows = db.prepare(query).all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
