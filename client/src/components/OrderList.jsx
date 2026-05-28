import OrderCard from './OrderCard';

export default function OrderList({ orders, readOnly }) {
  if (orders.length === 0) {
    return <p className="empty">Нет заказов</p>;
  }

  return (
    <div className="order-list">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} readOnly={readOnly} />
      ))}
    </div>
  );
}
