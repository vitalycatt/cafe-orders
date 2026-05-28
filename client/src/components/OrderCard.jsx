const STATUS_LABELS = {
  pending: 'Новый',
  in_progress: 'Готовится',
  done: 'Готов',
};

const STATUS_CLASSES = {
  pending: 'status-pending',
  in_progress: 'status-progress',
  done: 'status-done',
};

export default function OrderCard({ order, onStatusChange, readOnly }) {
  const time = order.created_at
    ? new Date(order.created_at + 'Z').toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className={`order-card ${STATUS_CLASSES[order.status]}`}>
      <div className="order-card-header">
        <strong>{order.customer_name}</strong>
        <span className="order-time">{time}</span>
      </div>
      <div className="order-card-body">
        <span className="drink-name">{order.drink_name}</span>
        <span className="drink-price">{order.price} ₽</span>
      </div>
      {order.notes && <div className="order-notes">{order.notes}</div>}
      <div className="order-card-footer">
        <span className={`status-badge ${STATUS_CLASSES[order.status]}`}>
          {STATUS_LABELS[order.status]}
        </span>
        {!readOnly && onStatusChange && (
          <div className="status-actions">
            {order.status === 'pending' && (
              <button
                className="btn btn-sm btn-progress"
                onClick={() => onStatusChange(order.id, 'in_progress')}
              >
                Начать
              </button>
            )}
            {order.status === 'in_progress' && (
              <button
                className="btn btn-sm btn-done"
                onClick={() => onStatusChange(order.id, 'done')}
              >
                Готово
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
