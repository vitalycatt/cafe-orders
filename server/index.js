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
    origin: ['http://localhost:5173', process.env.APP_URL].filter(Boolean),
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Serve static files in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// Socket.io events
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // --- Orders ---
  socket.on('orders:load', () => {
    const orders = db.getOrdersByShift();
    socket.emit('orders:list', orders);
  });

  socket.on('order:create', (data) => {
    try {
      const order = db.createOrder(data.customer_name, data.menu_item_id, data.notes);
      io.emit('order:new', order);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('order:update', (data) => {
    try {
      const order = db.updateOrderStatus(data.id, data.status);
      io.emit('order:updated', order);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // --- Menu ---
  socket.on('menu:load', () => {
    const items = db.getMenuItems();
    socket.emit('menu:list', items);
  });

  socket.on('menu:add', (data) => {
    try {
      db.addMenuItem(data.name, data.price);
      const items = db.getMenuItems();
      io.emit('menu:changed', items);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('menu:update', (data) => {
    try {
      db.updateMenuItem(data.id, data.name, data.price);
      const items = db.getMenuItems();
      io.emit('menu:changed', items);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('menu:delete', (data) => {
    try {
      db.deleteMenuItem(data.id);
      const items = db.getMenuItems();
      io.emit('menu:changed', items);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // --- Shift Report ---
  socket.on('shift:report', (data) => {
    const report = db.getShiftReport(data?.date);
    socket.emit('shift:report_data', report);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Start bot
require('./bot');
