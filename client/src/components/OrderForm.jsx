import { useState } from 'react';

export default function OrderForm({ socket, menuItems }) {
  const [customerName, setCustomerName] = useState('');
  const [menuItemId, setMenuItemId] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerName.trim() || !menuItemId || sending) return;

    setSending(true);
    socket.emit(
      'order:create',
      {
        customer_name: customerName.trim(),
        menu_item_id: Number(menuItemId),
        notes: notes.trim(),
      },
      (response) => {
        setSending(false);
        if (response?.ok) {
          setCustomerName('');
          setMenuItemId('');
          setNotes('');
        }
      }
    );
  };

  return (
    <form className="order-form" onSubmit={handleSubmit}>
      <h2>Новый заказ</h2>
      <input
        type="text"
        placeholder="Имя клиента"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        required
      />
      <select value={menuItemId} onChange={(e) => setMenuItemId(e.target.value)} required>
        <option value="">Выберите напиток</option>
        {menuItems.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} — {item.price} ₽
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Заметки (необязательно)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <button type="submit" className="btn btn-primary" disabled={sending}>
        {sending ? 'Отправка...' : 'Добавить заказ'}
      </button>
    </form>
  );
}
