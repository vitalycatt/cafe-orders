import Coin from './Coin';

export default function ShiftReport({ report }) {
  const totalItems = report.orders.reduce(
    (sum, order) => sum + (order.items || []).reduce((s, i) => s + i.quantity, 0),
    0,
  );

  const sortedSummary = [...report.summary].sort((a, b) => b.count - a.count);

  const customers = Object.values(
    report.orders.reduce((acc, order) => {
      const name = order.customer_name || '—';
      if (!acc[name]) acc[name] = { name, items: 0, total: 0 };
      acc[name].items += (order.items || []).reduce((s, i) => s + i.quantity, 0);
      acc[name].total += order.total || 0;
      return acc;
    }, {}),
  ).sort((a, b) => b.total - a.total);

  if (report.orders.length === 0) {
    return <p className="empty">Нет заказов за эту смену.</p>;
  }

  return (
    <div className="shift-report">
      <div className="report-stats">
        <div className="stat">
          <span className="stat-value">{report.totalOrders}</span>
          <span className="stat-label">Заказов</span>
        </div>
        <div className="stat">
          <span className="stat-value">{totalItems}</span>
          <span className="stat-label">Позиций</span>
        </div>
        <div className="stat highlight">
          <span className="stat-value">{report.totalRevenue}<Coin /></span>
          <span className="stat-label">Выручка</span>
        </div>
      </div>

      {sortedSummary.length > 0 && (
        <div className="report-card">
          <div className="report-card-title">Позиции</div>
          {sortedSummary.map((item) => (
            <div key={item.name} className="report-row">
              <span className="report-row-name">{item.name}</span>
              <span className="report-row-value">{item.count}</span>
            </div>
          ))}
        </div>
      )}

      {customers.length > 0 && (
        <div className="report-card">
          <div className="report-card-title">Клиенты</div>
          {customers.map((c) => (
            <div key={c.name} className="report-row">
              <span className="report-row-name">{c.name}</span>
              <span className="report-row-meta">{c.items} поз.</span>
              <span className="report-row-value">{c.total}<Coin /></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
