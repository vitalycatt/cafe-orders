import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import ShiftReport from '../components/ShiftReport';
import ReceiptPreview from '../components/ReceiptPreview';

export default function ShiftReportPage() {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.emit('shift:report');
    socket.on('shift:report_data', setReport);

    return () => {
      socket.off('shift:report_data', setReport);
    };
  }, [socket]);

  return (
    <div className="page report-page">
      <header className="page-header">
        <h1>Отчёт за смену</h1>
        <div className="header-actions">
          {report && (
            <button className="btn-sm" onClick={() => setShowReceipt(true)}>
              Предпросмотр чека
            </button>
          )}
          <button className="btn-sm" onClick={() => navigate(-1)}>Назад</button>
        </div>
      </header>

      {report ? <ShiftReport report={report} /> : (
        <div className="loader-center">
          <div className="spinner" />
        </div>
      )}

      {showReceipt && report && (
        <ReceiptPreview report={report} onClose={() => setShowReceipt(false)} />
      )}
    </div>
  );
}
