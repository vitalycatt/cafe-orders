const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'cafe.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    price REAL NOT NULL,
    available INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    menu_item_id INTEGER NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    shift_date TEXT DEFAULT (date('now')),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
  );
`);

// --- Menu ---

function getMenuItems() {
  return db.prepare('SELECT * FROM menu_items WHERE available = 1 ORDER BY name').all();
}

function addMenuItem(name, price) {
  const info = db.prepare('INSERT INTO menu_items (name, price) VALUES (?, ?)').run(name, price);
  return db.prepare('SELECT * FROM menu_items WHERE id = ?').get(info.lastInsertRowid);
}

function updateMenuItem(id, name, price) {
  db.prepare('UPDATE menu_items SET name = ?, price = ? WHERE id = ?').run(name, price, id);
  return db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
}

function deleteMenuItem(id) {
  db.prepare('UPDATE menu_items SET available = 0 WHERE id = ?').run(id);
}

// --- Orders ---

function createOrder(customerName, menuItemId, notes) {
  const info = db.prepare(
    'INSERT INTO orders (customer_name, menu_item_id, notes) VALUES (?, ?, ?)'
  ).run(customerName, menuItemId, notes || null);
  return getOrderById(info.lastInsertRowid);
}

function getOrderById(id) {
  return db.prepare(`
    SELECT o.*, m.name AS drink_name, m.price
    FROM orders o
    JOIN menu_items m ON o.menu_item_id = m.id
    WHERE o.id = ?
  `).get(id);
}

function getOrdersByShift(shiftDate) {
  const date = shiftDate || new Date().toISOString().slice(0, 10);
  return db.prepare(`
    SELECT o.*, m.name AS drink_name, m.price
    FROM orders o
    JOIN menu_items m ON o.menu_item_id = m.id
    WHERE o.shift_date = ?
    ORDER BY o.created_at ASC
  `).all(date);
}

function updateOrderStatus(id, status) {
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  return getOrderById(id);
}

function getShiftReport(shiftDate) {
  const date = shiftDate || new Date().toISOString().slice(0, 10);
  const orders = getOrdersByShift(date);

  const summary = {};
  let totalRevenue = 0;

  for (const order of orders) {
    if (!summary[order.drink_name]) {
      summary[order.drink_name] = { count: 0, revenue: 0, price: order.price };
    }
    summary[order.drink_name].count++;
    if (order.status === 'done') {
      summary[order.drink_name].revenue += order.price;
      totalRevenue += order.price;
    }
  }

  return {
    date,
    orders,
    summary: Object.entries(summary).map(([name, data]) => ({
      name,
      count: data.count,
      price: data.price,
      revenue: data.revenue,
    })),
    totalRevenue,
    totalOrders: orders.length,
    completedOrders: orders.filter((o) => o.status === 'done').length,
  };
}

module.exports = {
  getMenuItems,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createOrder,
  getOrdersByShift,
  updateOrderStatus,
  getShiftReport,
};
