import { useState } from 'react';
import { CATEGORIES } from '../constants';

export default function MenuManager({ socket, menuItems }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('coffee');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('coffee');

  const handleAdd = (e) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    socket.emit('menu:add', { name: name.trim(), price: Number(price), category });
    setName('');
    setPrice('');
    setCategory('coffee');
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice(String(item.price));
    setEditCategory(item.category || 'coffee');
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (!editName.trim() || !editPrice) return;
    socket.emit('menu:update', {
      id: editingId,
      name: editName.trim(),
      price: Number(editPrice),
      category: editCategory,
    });
    setEditingId(null);
  };

  const handleDelete = (id) => {
    socket.emit('menu:delete', { id });
  };

  return (
    <div className="menu-manager">
      <form className="menu-add-form" onSubmit={handleAdd}>
        <div className="menu-add-row">
          <input
            type="text"
            placeholder="Название"
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
        </div>
        <div className="menu-add-row">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">Добавить</button>
        </div>
      </form>

      <div className="menu-categories">
        {CATEGORIES.map((cat) => {
          const items = menuItems.filter((i) => (i.category || 'coffee') === cat.value);
          return (
            <div key={cat.value} className="menu-category">
              <div className="menu-category-header">
                <span>{cat.label}</span>
                <span className="menu-category-count">{items.length}</span>
              </div>
              <div className="menu-list">
                {items.length === 0 && (
                  <p className="menu-empty">Нет позиций</p>
                )}
                {items.map((item) =>
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
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <div className="menu-item-actions">
                        <button type="submit" className="btn btn-sm btn-primary-sm">Сохранить</button>
                        <button type="button" className="btn btn-sm" onClick={() => setEditingId(null)}>Отмена</button>
                      </div>
                    </form>
                  ) : (
                    <div key={item.id} className="menu-item">
                      <span className="menu-item-name">{item.name}</span>
                      <span className="menu-item-price">{item.price} ₽</span>
                      <button className="btn btn-sm" onClick={() => startEdit(item)}>Изм.</button>
                      <button className="btn btn-sm btn-danger-sm" onClick={() => handleDelete(item.id)}>Удал.</button>
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
