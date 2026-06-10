require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.APP_URL
      ? ['http://localhost:5173', process.env.APP_URL]
      : true,
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // --- Orders ---
  socket.on('orders:load', async () => {
    const orders = await db.getOrdersByShift();
    socket.emit('orders:list', orders);
  });

  socket.on('order:create', async (data, callback) => {
    try {
      const order = await db.createOrder(data.customer_name, data.items, data.notes);
      io.emit('order:new', order);
      if (typeof callback === 'function') callback({ ok: true });
    } catch (err) {
      socket.emit('error', { message: err.message });
      if (typeof callback === 'function') callback({ ok: false, error: err.message });
    }
  });

  socket.on('order:update', async (data) => {
    try {
      const order = await db.updateOrderStatus(data.id, data.status);
      io.emit('order:updated', order);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // --- Menu ---
  socket.on('menu:load', async () => {
    const items = await db.getMenuItems();
    socket.emit('menu:list', items);
  });

  socket.on('menu:add', async (data) => {
    try {
      await db.addMenuItem(data.name, data.price, data.category);
      const items = await db.getMenuItems();
      io.emit('menu:changed', items);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('menu:update', async (data) => {
    try {
      await db.updateMenuItem(data.id, data.name, data.price, data.category);
      const items = await db.getMenuItems();
      io.emit('menu:changed', items);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('menu:delete', async (data) => {
    try {
      await db.deleteMenuItem(data.id);
      const items = await db.getMenuItems();
      io.emit('menu:changed', items);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // --- Shift Report ---
  socket.on('shift:report', async (data) => {
    const report = await db.getShiftReport(data?.date);
    socket.emit('shift:report_data', report);
  });

  socket.on('order:edit', async (data, callback) => {
    try {
      const order = await db.editOrder(data.id, data.customer_name, data.items, data.notes);
      io.emit('order:updated', order);
      if (typeof callback === 'function') callback({ ok: true });
    } catch (err) {
      socket.emit('error', { message: err.message });
      if (typeof callback === 'function') callback({ ok: false, error: err.message });
    }
  });

  socket.on('order:delete', async (data) => {
    try {
      await db.deleteOrder(data.id);
      io.emit('order:deleted', data.id);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // --- Bot users & receipt sending ---
  socket.on('bot:users', async (callback) => {
    try {
      const users = await db.getBotUsers();
      if (typeof callback === 'function') callback(users);
    } catch {
      if (typeof callback === 'function') callback([]);
    }
  });

  socket.on('receipt:send', async (data, callback) => {
    try {
      const { chatId, image } = data;
      const buffer = Buffer.isBuffer(image) ? image : Buffer.from(image);
      const date = new Date().toLocaleDateString('ru-RU');
      await botModule.sendPhoto(chatId, buffer, `Чек смены ${date}`);
      if (typeof callback === 'function') callback({ ok: true });
    } catch (err) {
      if (typeof callback === 'function') callback({ ok: false, error: err.message });
    }
  });

  // --- Customers autocomplete ---
  socket.on('customers:search', async (query, callback) => {
    try {
      const names = await db.searchCustomers(query);
      if (typeof callback === 'function') callback(names);
    } catch {
      if (typeof callback === 'function') callback([]);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

let botModule = { sendPhoto: async () => { throw new Error('Bot not loaded yet'); } };

const PORT = process.env.PORT || 3000;

db.initDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    botModule = require('./bot');
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
