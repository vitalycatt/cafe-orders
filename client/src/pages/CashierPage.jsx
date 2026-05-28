import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import OrderForm from '../components/OrderForm';
import OrderList from '../components/OrderList';
import MenuManager from '../components/MenuManager';

export default function CashierPage() {
  const { socket, connected } = useSocket();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [showMenu, setShowMenu] = useState(false);

  const loadData = useCallback(() => {
    if (!socket) return;
    socket.emit('orders:load');
    socket.emit('menu:load');
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    loadData();

    socket.on('orders:list', setOrders);
    socket.on('order:new', (order) => setOrders((prev) => [...prev, order]));
    socket.on('order:updated', (order) =>
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)))
    );
    socket.on('menu:list', setMenuItems);
    socket.on('menu:changed', setMenuItems);

    return () => {
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

      <OrderForm socket={socket} menuItems={menuItems} />

      <div className="section-actions">
        <button className="btn" onClick={() => setShowMenu(!showMenu)}>
          {showMenu ? 'Скрыть меню' : 'Управление меню'}
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/report')}>
          Отчёт за смену
        </button>
      </div>

      {showMenu && <MenuManager socket={socket} menuItems={menuItems} />}

      <h2>Текущие заказы</h2>
      <OrderList orders={orders} readOnly />
    </div>
  );
}
