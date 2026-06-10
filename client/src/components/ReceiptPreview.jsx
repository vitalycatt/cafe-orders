import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';

const SEPARATOR = '--------------------------------';

function formatUserName(u) {
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ');
  return u.username ? `${name || u.username} (@${u.username})` : name || `id${u.chat_id}`;
}

export default function ReceiptPreview({ report, onClose, socket }) {
  const receiptRef = useRef(null);
  const [stage, setStage] = useState('receipt'); // receipt | pick | sending | sent
  const [botUsers, setBotUsers] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    const canvas = await html2canvas(receiptRef.current, { backgroundColor: '#ffffff', scale: 2 });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${report.date}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleSendClick = () => {
    if (!socket?.connected) { setError('Нет соединения с сервером'); return; }
    setLoadingUsers(true);
    setError('');
    socket.emit('bot:users', (users) => {
      setLoadingUsers(false);
      setBotUsers(users);
      setSelectedChatId(users.length === 1 ? users[0].chat_id : null);
      setStage('pick');
    });
  };

  const handleConfirmSend = async () => {
    if (!selectedChatId || !receiptRef.current) return;
    setStage('sending');
    setError('');
    try {
      const canvas = await html2canvas(receiptRef.current, { backgroundColor: '#ffffff', scale: 2 });
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
      const arrayBuffer = await blob.arrayBuffer();
      socket.emit('receipt:send', { chatId: selectedChatId, image: arrayBuffer }, (res) => {
        if (res?.ok) {
          setStage('sent');
        } else {
          setError(res?.error || 'Ошибка отправки');
          setStage('pick');
        }
      });
    } catch (e) {
      setError(e.message);
      setStage('pick');
    }
  };

  return (
    <div className="receipt-overlay" onClick={stage === 'receipt' ? onClose : undefined}>
      <div className="receipt-modal" onClick={(e) => e.stopPropagation()}>

        <div className="receipt" ref={receiptRef}>
          <div className="receipt-header">КАФЕ</div>
          <div className="receipt-line">{SEPARATOR}</div>
          <div className="receipt-date">Смена: {report.date}</div>
          <div className="receipt-line">{SEPARATOR}</div>
          {report.orders.length > 0 && (
            <>
              <div className="receipt-section-title">ЗАКАЗЫ</div>
              {report.orders.map((order) => (
                <div key={order.id}>
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="receipt-row">
                      <span>{item.name}{item.quantity > 1 ? ` x${item.quantity}` : ''}</span>
                      <span>{item.price * item.quantity} P</span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="receipt-line">{SEPARATOR}</div>
            </>
          )}
          {report.summary.length > 0 && (
            <>
              <div className="receipt-section-title">СВОДКА</div>
              {report.summary.map((item) => (
                <div key={item.name} className="receipt-row">
                  <span>{item.name} x{item.count}</span>
                  <span>{item.revenue} P</span>
                </div>
              ))}
              <div className="receipt-line">{SEPARATOR}</div>
            </>
          )}
          <div className="receipt-row receipt-total">
            <span>ИТОГО</span><span>{report.totalRevenue} P</span>
          </div>
          <div className="receipt-row">
            <span>Заказов</span><span>{report.totalOrders}</span>
          </div>
          <div className="receipt-row">
            <span>Выполнено</span><span>{report.completedOrders}</span>
          </div>
          <div className="receipt-line">{SEPARATOR}</div>
          <div className="receipt-footer">СПАСИБО!</div>
        </div>

        {/* Stage: receipt */}
        {stage === 'receipt' && (
          <div className="receipt-actions receipt-actions--col">
            {error && <p className="receipt-send-error">{error}</p>}
            <button
              className="btn btn-primary"
              onClick={handleSendClick}
              disabled={loadingUsers}
            >
              {loadingUsers ? 'Загрузка...' : 'Отправить в Telegram'}
            </button>
            <div className="receipt-actions receipt-actions--row" style={{ borderTop: 'none', padding: 0 }}>
              <button className="btn btn-secondary" onClick={handleDownload}>Скачать PNG</button>
              <button className="btn btn-secondary" onClick={onClose}>Закрыть</button>
            </div>
          </div>
        )}

        {/* Stage: pick recipient */}
        {stage === 'pick' && (
          <div className="receipt-send-panel">
            <p className="receipt-send-title">Кому отправить?</p>
            {botUsers.length === 0 ? (
              <p className="receipt-send-empty">
                Нет пользователей. Напишите /start боту в Telegram.
              </p>
            ) : (
              <div className="receipt-user-list">
                {botUsers.map((u) => (
                  <label
                    key={u.chat_id}
                    className={`receipt-user-item ${selectedChatId === u.chat_id ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="recipient"
                      checked={selectedChatId === u.chat_id}
                      onChange={() => setSelectedChatId(u.chat_id)}
                    />
                    {formatUserName(u)}
                  </label>
                ))}
              </div>
            )}
            {error && <p className="receipt-send-error">{error}</p>}
            <div className="receipt-actions receipt-actions--row" style={{ borderTop: 'none', padding: 0 }}>
              <button className="btn btn-secondary" onClick={() => setStage('receipt')}>Назад</button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmSend}
                disabled={!selectedChatId}
              >
                Отправить
              </button>
            </div>
          </div>
        )}

        {/* Stage: sending */}
        {stage === 'sending' && (
          <div className="receipt-actions">
            <p style={{ flex: 1, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
              Отправляем...
            </p>
          </div>
        )}

        {/* Stage: sent */}
        {stage === 'sent' && (
          <div className="receipt-actions">
            <p style={{ flex: 1, color: 'var(--done)', fontSize: 14, fontWeight: 600 }}>
              Отправлено!
            </p>
            <button className="btn btn-primary" onClick={onClose}>ОК</button>
          </div>
        )}

      </div>
    </div>
  );
}
