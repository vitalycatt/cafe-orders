import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import OrderForm from '../components/OrderForm';
import OrderList from '../components/OrderList';
import MenuManager from '../components/MenuManager';
import Modal from '../components/Modal';

export default function CashierPage() {
  const { socket, connected } = useSocket();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showOrder, setShowOrder] = useState(false);

  const loadData = useCallback(() => {
    if (!socket) return;
    socket.emit('orders:load');
    socket.emit('menu:load');
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    loadData();

    socket.on('connect', loadData);
    socket.on('orders:list', setOrders);
    socket.on('order:new', (order) => setOrders((prev) => [...prev, order]));
    socket.on('order:updated', (order) =>
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)))
    );
    socket.on('menu:list', setMenuItems);
    socket.on('menu:changed', setMenuItems);

    return () => {
      socket.off('connect', loadData);
      socket.off('orders:list', setOrders);
      socket.off('order:new');
      socket.off('order:updated');
      socket.off('menu:list', setMenuItems);
      socket.off('menu:changed', setMenuItems);
    };
  }, [socket, loadData]);

  const changeRole = () => {
    localStorage.removeItem('cafe_role');
    navigate('/');
  };

  return (
    <div className="page cashier-page">
      <header className="page-header">
        <h1>Кассир</h1>
        <div className="header-actions">
          <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
          <button className="btn-sm" onClick={changeRole}>Сменить роль</button>
        </div>
      </header>

      <button className="btn btn-primary btn-new-order" onClick={() => setShowOrder(true)}>
        + Новый заказ
      </button>

      <div className="section-actions">
        <button className="btn btn-secondary" onClick={() => setShowMenu(true)}>
          Меню
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/report')}>
          Отчёт
        </button>
      </div>

      <h2 className="section-title">Заказы смены</h2>
      <OrderList orders={orders} readOnly />

      {showMenu && (
        <Modal title="Управление меню" onClose={() => setShowMenu(false)}>
          <MenuManager socket={socket} menuItems={menuItems} />
        </Modal>
      )}

      {showOrder && (
        <Modal title="Новый заказ" onClose={() => setShowOrder(false)}>
          <OrderForm socket={socket} menuItems={menuItems} onClose={() => setShowOrder(false)} />
        </Modal>
      )}
    </div>
  );
}
