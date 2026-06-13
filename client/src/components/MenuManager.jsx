import { useState, useEffect } from 'react';
import Coin from './Coin';
import { CATEGORIES } from '../constants';

export default function MenuManager({ socket, menuItems }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('coffee');
  const [editingItem, setEditingItem] = useState(null);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    socket.emit('menu:add', { name: name.trim(), price: Number(price), category });
    setName('');
    setPrice('');
    setCategory('coffee');
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
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="menu-item menu-item--clickable"
                    onClick={() => setEditingItem(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setEditingItem(item);
                      }
                    }}
                  >
                    <span className="menu-item-name">{item.name}</span>
                    <span className="menu-item-price">{item.price}<Coin /></span>
                    <button
                      className="btn btn-sm btn-danger-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                    >
                      Удал.
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {editingItem && (
        <MenuEditSheet
          item={editingItem}
          socket={socket}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}

function MenuEditSheet({ item, socket, onClose }) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));
  const [category, setCategory] = useState(item.category || 'coffee');

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    socket.emit('menu:update', {
      id: item.id,
      name: name.trim(),
      price: Number(price),
      category,
    });
    onClose();
  };

  return (
    <div className="edit-sheet-overlay" onClick={onClose}>
      <div className="edit-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="edit-sheet-handle" />
        <div className="edit-sheet-header">
          <h3>Редактировать</h3>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <form className="edit-sheet-form" onSubmit={handleSubmit}>
          <label className="edit-field">
            <span>Название</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </label>
          <label className="edit-field">
            <span>Цена</span>
            <input
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </label>
          <label className="edit-field">
            <span>Категория</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
          <div className="edit-sheet-actions">
            <button type="submit" className="btn btn-primary">Сохранить</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  );
}
