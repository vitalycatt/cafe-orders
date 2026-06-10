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
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  const loadData = useCallback(() => {
    if (!socket) return;
    socket.emit('orders:load');
    socket.emit('menu:load');
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    loadData();

    socket.on('connect', loadData);
    socket.on('orders:list', (data) => { setOrders(data); setOrdersLoading(false); });
    socket.on('order:new', (order) => setOrders((prev) => [...prev, order]));
    socket.on('order:updated', (order) =>
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)))
    );
    socket.on('order:deleted', (id) =>
      setOrders((prev) => prev.filter((o) => o.id !== id))
    );
    socket.on('menu:list', (data) => { setMenuItems(data); setMenuLoading(false); });
    socket.on('menu:changed', setMenuItems);

    return () => {
      socket.off('connect', loadData);
      socket.off('orders:list');
      socket.off('order:new');
      socket.off('order:updated');
      socket.off('order:deleted');
      socket.off('menu:list');
      socket.off('menu:changed', setMenuItems);
    };
  }, [socket, loadData]);

  const handleDelete = (id) => socket.emit('order:delete', { id });

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

      {ordersLoading ? (
        <div className="loader-center">
          <div className="spinner" />
        </div>
      ) : (
        <>
          <h2 className="section-title">Заказы смены</h2>
          <OrderList
            orders={orders}
            readOnly
            onEdit={setEditingOrder}
            onDelete={handleDelete}
          />
        </>
      )}

      {showMenu && (
        <Modal title="Управление меню" onClose={() => setShowMenu(false)}>
          {menuLoading ? (
            <div className="loader-center">
              <div className="spinner" />
            </div>
          ) : (
            <MenuManager socket={socket} menuItems={menuItems} />
          )}
        </Modal>
      )}

      {showOrder && (
        <Modal title="Новый заказ" onClose={() => setShowOrder(false)}>
          <OrderForm socket={socket} menuItems={menuItems} onClose={() => setShowOrder(false)} />
        </Modal>
      )}

      {editingOrder && (
        <Modal title="Редактировать заказ" onClose={() => setEditingOrder(null)}>
          <OrderForm
            socket={socket}
            menuItems={menuItems}
            initialOrder={editingOrder}
            onClose={() => setEditingOrder(null)}
          />
        </Modal>
      )}
    </div>
  );
}
