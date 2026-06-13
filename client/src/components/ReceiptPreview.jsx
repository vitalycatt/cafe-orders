import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';

const SEPARATOR = '--------------------------------';

export default function ReceiptPreview({ report, socket, onClose }) {
  const receiptRef = useRef(null);
  const [sending, setSending] = useState(false);

  const renderBlob = async () =>
    new Promise(async (resolve) => {
      const canvas = await html2canvas(receiptRef.current, { backgroundColor: '#ffffff', scale: 2 });
      canvas.toBlob(resolve, 'image/png');
    });

  const downloadBlob = (blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${report.date}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!receiptRef.current || sending) return;
    const blob = await renderBlob();
    if (!blob) return;

    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

    // Outside Telegram (or no user info) — just download the PNG.
    if (!tgUser?.id || !socket) {
      downloadBlob(blob);
      return;
    }

    setSending(true);
    const arrayBuffer = await blob.arrayBuffer();
    socket.emit(
      'receipt:send',
      {
        chatId: tgUser.id,
        image: arrayBuffer,
        filename: `receipt-${report.date}.png`,
      },
      (res) => {
        setSending(false);
        if (res?.ok) {
          alert('Чек отправлен в личку бота');
          onClose?.();
        } else {
          alert(`Не удалось отправить: ${res?.error || 'неизвестная ошибка'}`);
        }
      },
    );
  };

  return (
    <div className="receipt-overlay" onClick={onClose}>
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

        <div className="receipt-actions receipt-actions--row">
          <button className="btn btn-primary" onClick={handleShare} disabled={sending}>
            {sending ? 'Отправка...' : 'Поделиться'}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Закрыть</button>
        </div>

      </div>
    </div>
  );
}
