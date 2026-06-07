import { useState } from 'react';
import { CATEGORIES } from '../constants';

const QUICK_TAGS = ['Безлактозное молоко'];

export default function OrderForm({ socket, menuItems, onClose }) {
  const [step, setStep] = useState(0);
  const [quantities, setQuantities] = useState({});
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [sending, setSending] = useState(false);

  const selectedItems = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const item = menuItems.find((m) => m.id === Number(id));
      return { ...item, quantity: qty };
    });

  const total = selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalQty = selectedItems.reduce((sum, i) => sum + i.quantity, 0);

  const toggleTag = (tag) => {
    setNotes((prev) => {
      if (prev.includes(tag)) {
        return prev.replace(tag, '').replace(/,\s*$|^,\s*/, '').trim();
      }
      return prev ? `${prev}, ${tag}` : tag;
    });
  };

  const changeQty = (id, delta) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta),
    }));
  };

  const handleSubmit = () => {
    if (!customerName.trim() || selectedItems.length === 0 || sending) return;
    setSending(true);
    socket.emit(
      'order:create',
      {
        customer_name: customerName.trim(),
        notes: notes.trim(),
        items: selectedItems.map((i) => ({ menu_item_id: i.id, quantity: i.quantity })),
      },
      (res) => {
        setSending(false);
        if (res?.ok) onClose?.();
      }
    );
  };

  return (
    <div className="order-wizard">
      <div className="wizard-steps">
        {['Позиции', 'Оформление'].map((_label, i) => (
          <div key={i} className="wizard-step-item">
            {i > 0 && <div className={`wizard-connector ${i <= step ? 'done' : ''}`} />}
            <div className={`wizard-step-num ${i === step ? 'active' : i < step ? 'done' : ''}`}>
              {i < step ? '✓' : i + 1}
            </div>
          </div>
        ))}
      </div>

      {step === 0 && (
        <>
          <div className="wizard-items">
            {CATEGORIES.map((cat) => {
              const items = menuItems.filter((i) => (i.category || 'coffee') === cat.value);
              if (items.length === 0) return null;
              return (
                <div key={cat.value} className="wizard-category">
                  <div className="wizard-category-label">{cat.label}</div>
                  {items.map((item) => {
                    const qty = quantities[item.id] || 0;
                    return (
                      <div key={item.id} className={`wizard-item ${qty > 0 ? 'selected' : ''}`}>
                        <div className="wizard-item-info">
                          <span className="wizard-item-name">{item.name}</span>
                          <span className="wizard-item-price">{item.price} ₽</span>
                        </div>
                        <div className="wizard-qty">
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => changeQty(item.id, -1)}
                            disabled={qty === 0}
                          >
                            −
                          </button>
                          <span className="qty-value">{qty}</span>
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => changeQty(item.id, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="wizard-footer">
            {selectedItems.length > 0 ? (
              <div className="wizard-bar">
                <span className="wizard-bar-info">
                  {totalQty} поз. · <strong>{total} ₽</strong>
                </span>
                <button className="btn btn-primary" onClick={() => setStep(1)}>
                  Далее
                </button>
              </div>
            ) : (
              <p className="wizard-hint">Выберите позиции из меню</p>
            )}
          </div>
        </>
      )}

      {step === 1 && (
        <div className="wizard-step-content">
          <input
            type="text"
            placeholder="Имя клиента"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            autoFocus
          />

          <div>
            <textarea
              className="wizard-textarea"
              placeholder="Пожелания или комментарии (необязательно)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <div className="wizard-tags">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-btn ${notes.includes(tag) ? 'active' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="wizard-order-summary">
            {selectedItems.map((item) => (
              <div key={item.id} className="wizard-summary-row">
                <span>
                  {item.name}
                  {item.quantity > 1 && <span className="summary-qty"> ×{item.quantity}</span>}
                </span>
                <span className="summary-subtotal">{item.price * item.quantity} ₽</span>
              </div>
            ))}
            <div className="wizard-summary-total">
              <span>Итого</span>
              <strong>{total} ₽</strong>
            </div>
          </div>

          <div className="wizard-nav">
            <button className="btn btn-secondary" onClick={() => setStep(0)}>
              Назад
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!customerName.trim() || sending}
            >
              {sending ? 'Отправка...' : 'Оформить заказ'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
