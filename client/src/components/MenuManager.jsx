import { useState } from 'react';

export default function MenuManager({ socket, menuItems }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    socket.emit('menu:add', { name: name.trim(), price: Number(price) });
    setName('');
    setPrice('');
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice(String(item.price));
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (!editName.trim() || !editPrice) return;
    socket.emit('menu:update', { id: editingId, name: editName.trim(), price: Number(editPrice) });
    setEditingId(null);
  };

  const handleDelete = (id) => {
    socket.emit('menu:delete', { id });
  };

  return (
    <div className="menu-manager">
      <h2>Управление меню</h2>

      <form className="menu-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Название напитка"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Цена"
          min="0"
          step="1"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary">Добавить</button>
      </form>

      <div className="menu-list">
        {menuItems.map((item) =>
          editingId === item.id ? (
            <form key={item.id} className="menu-item editing" onSubmit={handleUpdate}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
              <input
                type="number"
                min="0"
                step="1"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-sm">Сохранить</button>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>
                Отмена
              </button>
            </form>
          ) : (
            <div key={item.id} className="menu-item">
              <span className="menu-item-name">{item.name}</span>
              <span className="menu-item-price">{item.price} ₽</span>
              <button className="btn btn-sm" onClick={() => startEdit(item)}>Изм.</button>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>Удал.</button>
            </div>
          )
        )}
        {menuItems.length === 0 && <p className="empty">Меню пусто. Добавьте напитки.</p>}
      </div>
    </div>
  );
}
