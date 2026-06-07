import { useRef } from 'react';
import html2canvas from 'html2canvas';

const SEPARATOR = '--------------------------------';

export default function ReceiptPreview({ report, onClose }) {
  const receiptRef = useRef(null);

  const handleDownload = async () => {
    if (!receiptRef.current) return;

    const canvas = await html2canvas(receiptRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
    });

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
            <span>ИТОГО</span>
            <span>{report.totalRevenue} P</span>
          </div>
          <div className="receipt-row">
            <span>Заказов</span>
            <span>{report.totalOrders}</span>
          </div>
          <div className="receipt-row">
            <span>Выполнено</span>
            <span>{report.completedOrders}</span>
          </div>
          <div className="receipt-line">{SEPARATOR}</div>
          <div className="receipt-footer">СПАСИБО!</div>
        </div>

        <div className="receipt-actions">
          <button className="btn btn-primary" onClick={handleDownload}>
            Скачать PNG
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
