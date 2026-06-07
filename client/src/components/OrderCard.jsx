import { useState } from 'react';

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

export default function OrderCard({ order, onStatusChange, readOnly, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDeleteClick = () => {
    if (confirmDelete) {
      onDelete(order.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };
  const time = order.created_at
    ? new Date(order.created_at + 'Z').toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const items = order.items || [];
  const total = order.total ?? items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className={`order-card ${STATUS_CLASSES[order.status]}`}>
      <div className="order-card-header">
        <strong>{order.customer_name}</strong>
        <span className="order-time">{time}</span>
      </div>

      <div className="order-items-list">
        {items.map((item, idx) => (
          <div key={idx} className="order-item-row">
            <span className="order-item-name">
              {item.name}
              {item.quantity > 1 && <span className="order-item-qty"> ×{item.quantity}</span>}
            </span>
            <span className="order-item-subtotal">{item.price * item.quantity} ₽</span>
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="order-total">
          Итого: <strong>{total} ₽</strong>
        </div>
      )}

      {order.notes && <div className="order-notes">{order.notes}</div>}

      {(onEdit || onDelete) && (
        <div className="order-card-actions">
          {onEdit && (
            <button className="btn-order-edit" onClick={() => onEdit(order)}>
              Изменить
            </button>
          )}
          {onDelete && (
            <button
              className={`btn-order-delete ${confirmDelete ? 'confirm' : ''}`}
              onClick={handleDeleteClick}
            >
              {confirmDelete ? 'Точно удалить?' : 'Удалить'}
            </button>
          )}
        </div>
      )}

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
