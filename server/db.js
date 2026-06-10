const { createClient } = require("@libsql/client");

const db = createClient({
  url:
    process.env.TURSO_DATABASE_URL ||
    `file:${process.env.DATABASE_PATH || "cafe.db"}`,

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

  try {
    await db.execute(
      "ALTER TABLE menu_items ADD COLUMN category TEXT NOT NULL DEFAULT 'coffee'",
    );
  } catch {
    // Column already exists
  }

  // Fresh-install: orders without menu_item_id
  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      shift_date TEXT DEFAULT (date('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS bot_users (
      chat_id INTEGER PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migration: if orders still has legacy menu_item_id column, move to order_items
  try {
    const info = await db.execute("PRAGMA table_info(orders)");
    const hasMenuItemId = info.rows.some((col) => col.name === "menu_item_id");

    if (hasMenuItemId) {
      // Disable FK so we can drop the orders table while order_items references it
      await db.execute("PRAGMA foreign_keys = OFF");
      try {
        await db.batch(
          [
            {
              sql: `INSERT INTO order_items (order_id, menu_item_id, quantity)
                    SELECT id, menu_item_id, 1 FROM orders WHERE menu_item_id IS NOT NULL`,
            },
            {
              sql: `CREATE TABLE orders_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT NOT NULL,
                notes TEXT,
                status TEXT DEFAULT 'pending',
                created_at TEXT DEFAULT (datetime('now')),
                shift_date TEXT DEFAULT (date('now'))
              )`,
            },
            {
              sql: `INSERT INTO orders_new (id, customer_name, notes, status, created_at, shift_date)
                    SELECT id, customer_name, notes, status, created_at, shift_date FROM orders`,
            },
            { sql: "DROP TABLE orders" },
            { sql: "ALTER TABLE orders_new RENAME TO orders" },
          ],
          "write",
        );
      } finally {
        await db.execute("PRAGMA foreign_keys = ON");
      }
    }
  } catch (err) {
    console.error("Orders migration error:", err);
  }
}

// --- Menu ---

async function getMenuItems() {
  const result = await db.execute(
    "SELECT * FROM menu_items WHERE available = 1 ORDER BY name",
  );
  return result.rows;
}

async function addMenuItem(name, price, category = "coffee") {
  const result = await db.execute({
    sql: "INSERT INTO menu_items (name, price, category) VALUES (?, ?, ?)",
    args: [name, price, category],
  });
  const item = await db.execute({
    sql: "SELECT * FROM menu_items WHERE id = ?",
    args: [result.lastInsertRowid],
  });
  return item.rows[0];
}

async function updateMenuItem(id, name, price, category) {
  await db.execute({
    sql: "UPDATE menu_items SET name = ?, price = ?, category = ? WHERE id = ?",
    args: [name, price, category, id],
  });
  const result = await db.execute({
    sql: "SELECT * FROM menu_items WHERE id = ?",
    args: [id],
  });
  return result.rows[0];
}

async function deleteMenuItem(id) {
  await db.execute({
    sql: "UPDATE menu_items SET available = 0 WHERE id = ?",
    args: [id],
  });
}

// --- Orders ---

async function createOrder(customerName, items, notes) {
  if (!items || items.length === 0)
    throw new Error("Order must have at least one item");

  const result = await db.execute({
    sql: "INSERT INTO orders (customer_name, notes) VALUES (?, ?)",
    args: [customerName, notes || null],
  });
  const orderId = result.lastInsertRowid;

  await db.batch(
    items.map((item) => ({
      sql: "INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?, ?, ?)",
      args: [orderId, item.menu_item_id, item.quantity || 1],
    })),
    "write",
  );

  return getOrderById(orderId);
}

async function getOrderById(id) {
  const orderResult = await db.execute({
    sql: "SELECT * FROM orders WHERE id = ?",
    args: [id],
  });
  const order = orderResult.rows[0];
  if (!order) return null;

  const itemsResult = await db.execute({
    sql: `SELECT oi.id, oi.quantity, m.id AS menu_item_id, m.name, m.price, m.category
          FROM order_items oi
          JOIN menu_items m ON oi.menu_item_id = m.id
          WHERE oi.order_id = ?`,
    args: [id],
  });

  const items = itemsResult.rows;
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return { ...order, items, total };
}

async function getOrdersByShift(shiftDate) {
  const date = shiftDate || new Date().toISOString().slice(0, 10);

  const ordersResult = await db.execute({
    sql: "SELECT * FROM orders WHERE shift_date = ? ORDER BY created_at ASC",
    args: [date],
  });

  if (ordersResult.rows.length === 0) return [];

  const orderIds = ordersResult.rows.map((o) => o.id);
  const placeholders = orderIds.map(() => "?").join(",");

  const itemsResult = await db.execute({
    sql: `SELECT oi.order_id, oi.id, oi.quantity, m.id AS menu_item_id, m.name, m.price, m.category
          FROM order_items oi
          JOIN menu_items m ON oi.menu_item_id = m.id
          WHERE oi.order_id IN (${placeholders})`,
    args: orderIds,
  });

  const itemsByOrderId = {};
  for (const item of itemsResult.rows) {
    if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = [];
    itemsByOrderId[item.order_id].push(item);
  }

  return ordersResult.rows.map((order) => {
    const items = itemsByOrderId[order.id] || [];
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return { ...order, items, total };
  });
}

async function updateOrderStatus(id, status) {
  await db.execute({
    sql: "UPDATE orders SET status = ? WHERE id = ?",
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
    for (const item of order.items) {
      if (!summary[item.name]) {
        summary[item.name] = { count: 0, revenue: 0, price: item.price };
      }
      summary[item.name].count += item.quantity;
      if (order.status === "done") {
        const itemRevenue = item.price * item.quantity;
        summary[item.name].revenue += itemRevenue;
        totalRevenue += itemRevenue;
      }
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
    completedOrders: orders.filter((o) => o.status === "done").length,
  };
}

async function editOrder(id, customerName, items, notes) {
  if (!items || items.length === 0)
    throw new Error("Order must have at least one item");

  await db.batch(
    [
      {
        sql: "UPDATE orders SET customer_name = ?, notes = ? WHERE id = ?",
        args: [customerName, notes || null, id],
      },
      {
        sql: "DELETE FROM order_items WHERE order_id = ?",
        args: [id],
      },
      ...items.map((item) => ({
        sql: "INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?, ?, ?)",
        args: [id, item.menu_item_id, item.quantity || 1],
      })),
    ],
    "write",
  );

  return getOrderById(id);
}

async function deleteOrder(id) {
  await db.execute({
    sql: "DELETE FROM order_items WHERE order_id = ?",
    args: [id],
  });
  await db.execute({ sql: "DELETE FROM orders WHERE id = ?", args: [id] });
}

async function saveBotUser(chatId, username, firstName, lastName) {
  await db.execute({
    sql: `INSERT OR REPLACE INTO bot_users (chat_id, username, first_name, last_name, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'))`,
    args: [chatId, username || null, firstName || null, lastName || null],
  });
}

async function getBotUsers() {
  const result = await db.execute(
    "SELECT * FROM bot_users ORDER BY first_name, last_name",
  );
  return result.rows;
}

async function searchCustomers(query) {
  if (!query || query.trim().length < 1) return [];
  const result = await db.execute({
    sql: `SELECT DISTINCT customer_name FROM orders
          WHERE customer_name LIKE ?
          ORDER BY customer_name
          LIMIT 8`,
    args: [`%${query.trim()}%`],
  });
  return result.rows.map((r) => r.customer_name);
}

module.exports = {
  initDb,
  saveBotUser,
  getBotUsers,
  getMenuItems,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createOrder,
  editOrder,
  deleteOrder,
  getOrdersByShift,
  updateOrderStatus,
  getShiftReport,
  searchCustomers,
};
