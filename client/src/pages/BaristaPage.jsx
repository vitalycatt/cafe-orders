import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import OrderCard from '../components/OrderCard';

export default function BaristaPage() {
  const { socket, connected } = useSocket();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(() => {
    if (!socket) return;
    socket.emit('orders:load');
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    loadOrders();

    socket.on('connect', loadOrders);
    socket.on('orders:list', (data) => { setOrders(data); setLoading(false); });
    socket.on('order:new', (order) => setOrders((prev) => [...prev, order]));
    socket.on('order:updated', (order) =>
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)))
    );
    socket.on('order:deleted', (id) =>
      setOrders((prev) => prev.filter((o) => o.id !== id))
    );

    return () => {
      socket.off('connect', loadOrders);
      socket.off('orders:list');
      socket.off('order:new');
      socket.off('order:updated');
      socket.off('order:deleted');
    };
  }, [socket, loadOrders]);

  const updateStatus = (id, status) => {
    socket.emit('order:update', { id, status });
  };

  const changeRole = () => {
    localStorage.removeItem('cafe_role');
    navigate('/');
  };

  const pending = orders.filter((o) => o.status === 'pending');
  const inProgress = orders.filter((o) => o.status === 'in_progress');
  const done = orders.filter((o) => o.status === 'done');

  return (
    <div className="page barista-page">
      <header className="page-header">
        <h1>Бариста</h1>
        <div className="header-actions">
          <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
          <button className="btn-sm" onClick={changeRole}>Сменить роль</button>
        </div>
      </header>

      {loading ? (
        <div className="loader-center">
          <div className="spinner" />
        </div>
      ) : (
        <>
          <section className="order-section order-section--pending">
            <div className="order-section-header">
              <h2>Новые</h2>
              <span className="section-badge">{pending.length}</span>
            </div>
            {pending.length === 0 && <p className="empty">Нет новых заказов</p>}
            {pending.map((order) => (
              <OrderCard key={order.id} order={order} onStatusChange={updateStatus} />
            ))}
          </section>

          <section className="order-section order-section--progress">
            <div className="order-section-header">
              <h2>Готовится</h2>
              <span className="section-badge">{inProgress.length}</span>
            </div>
            {inProgress.length === 0 && <p className="empty">Нет заказов в работе</p>}
            {inProgress.map((order) => (
              <OrderCard key={order.id} order={order} onStatusChange={updateStatus} />
            ))}
          </section>

          <section className="order-section order-section--done">
            <div className="order-section-header">
              <h2>Готово</h2>
              <span className="section-badge">{done.length}</span>
            </div>
            {done.length === 0 && <p className="empty">Нет готовых заказов</p>}
            {done.map((order) => (
              <OrderCard key={order.id} order={order} onStatusChange={updateStatus} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}
