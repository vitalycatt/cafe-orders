import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RoleSelectPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('cafe_role');
    if (saved === 'cashier') navigate('/cashier');
    else if (saved === 'barista') navigate('/barista');
  }, [navigate]);

  const selectRole = (role) => {
    localStorage.setItem('cafe_role', role);
    navigate(`/${role}`);
  };

  return (
    <div className="role-select">
      <h1>Заказы кафе</h1>
      <p className="subtitle">Выберите вашу роль</p>
      <div className="role-buttons">
        <button className="role-btn cashier-btn" onClick={() => selectRole('cashier')}>
          <span className="role-icon">💰</span>
          <span className="role-label">Кассир</span>
        </button>
        <button className="role-btn barista-btn" onClick={() => selectRole('barista')}>
          <span className="role-icon">☕</span>
          <span className="role-label">Бариста</span>
        </button>
      </div>
    </div>
  );
}
