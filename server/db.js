const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:cafe.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      price REAL NOT NULL,
      available INTEGER DEFAULT 1,
      category TEXT NOT NULL DEFAULT 'coffee'
    )
  `);

  // Migration: add category column to existing tables
  try {
    await db.execute("ALTER TABLE menu_items ADD COLUMN category TEXT NOT NULL DEFAULT 'coffee'");
  } catch {
    // Column already exists
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      menu_item_id INTEGER NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      shift_date TEXT DEFAULT (date('now')),
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    )
  `);
}

// --- Menu ---

async function getMenuItems() {
  const result = await db.execute('SELECT * FROM menu_items WHERE available = 1 ORDER BY name');
  return result.rows;
}

async function addMenuItem(name, price, category = 'coffee') {
  const result = await db.execute({
    sql: 'INSERT INTO menu_items (name, price, category) VALUES (?, ?, ?)',
    args: [name, price, category],
  });
  const item = await db.execute({
    sql: 'SELECT * FROM menu_items WHERE id = ?',
    args: [result.lastInsertRowid],
  });
  return item.rows[0];
}

async function updateMenuItem(id, name, price, category) {
  await db.execute({
    sql: 'UPDATE menu_items SET name = ?, price = ?, category = ? WHERE id = ?',
    args: [name, price, category, id],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM menu_items WHERE id = ?',
    args: [id],
  });
  return result.rows[0];
}

async function deleteMenuItem(id) {
  await db.execute({
    sql: 'UPDATE menu_items SET available = 0 WHERE id = ?',
    args: [id],
  });
}

// --- Orders ---

async function createOrder(customerName, menuItemId, notes) {
  const result = await db.execute({
    sql: 'INSERT INTO orders (customer_name, menu_item_id, notes) VALUES (?, ?, ?)',
    args: [customerName, menuItemId, notes || null],
  });
  return getOrderById(result.lastInsertRowid);
}

async function getOrderById(id) {
  const result = await db.execute({
    sql: `SELECT o.*, m.name AS drink_name, m.price
          FROM orders o
          JOIN menu_items m ON o.menu_item_id = m.id
          WHERE o.id = ?`,
    args: [id],
  });
  return result.rows[0];
}

async function getOrdersByShift(shiftDate) {
  const date = shiftDate || new Date().toISOString().slice(0, 10);
  const result = await db.execute({
    sql: `SELECT o.*, m.name AS drink_name, m.price
          FROM orders o
          JOIN menu_items m ON o.menu_item_id = m.id
          WHERE o.shift_date = ?
          ORDER BY o.created_at ASC`,
    args: [date],
  });
  return result.rows;
}

async function updateOrderStatus(id, status) {
  await db.execute({
    sql: 'UPDATE orders SET status = ? WHERE id = ?',
    args: [status, id],
  });
  return getOrderById(id);
}

async function getShiftReport(shiftDate) {
  const date = shiftDate || new Date().toISOString().slice(0, 10);
  const orders = await getOrdersByShift(date);

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
  initDb,
  getMenuItems,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createOrder,
  getOrdersByShift,
  updateOrderStatus,
  getShiftReport,
};
