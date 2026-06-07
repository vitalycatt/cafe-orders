const STATUS_LABELS = {
  pending: 'Новый',
  in_progress: 'Готовится',
  done: 'Готов',
};

export default function ShiftReport({ report }) {
  return (
    <div className="shift-report">
      <div className="report-summary">
        <h2>Сводка за {report.date}</h2>
        <div className="report-stats">
          <div className="stat">
            <span className="stat-value">{report.totalOrders}</span>
            <span className="stat-label">Всего заказов</span>
          </div>
          <div className="stat">
            <span className="stat-value">{report.completedOrders}</span>
            <span className="stat-label">Выполнено</span>
          </div>
          <div className="stat highlight">
            <span className="stat-value">{report.totalRevenue} ₽</span>
            <span className="stat-label">Выручка</span>
          </div>
        </div>
      </div>

      {report.summary.length > 0 && (
        <div className="report-drinks">
          <h3>По напиткам</h3>
          <table>
            <thead>
              <tr>
                <th>Позиция</th>
                <th>Кол-во</th>
                <th>Цена</th>
                <th>Выручка</th>
              </tr>
            </thead>
            <tbody>
              {report.summary.map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{item.count}</td>
                  <td>{item.price} ₽</td>
                  <td>{item.revenue} ₽</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.orders.length > 0 && (
        <div className="report-orders">
          <h3>Все заказы</h3>
          <table>
            <thead>
              <tr>
                <th>Время</th>
                <th>Клиент</th>
                <th>Позиции</th>
                <th>Сумма</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {report.orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    {order.created_at
                      ? new Date(order.created_at + 'Z').toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </td>
                  <td>{order.customer_name}</td>
                  <td>
                    {(order.items || []).map((i, idx) => (
                      <span key={idx}>
                        {i.name}{i.quantity > 1 ? ` ×${i.quantity}` : ''}
                        {idx < order.items.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </td>
                  <td>{order.total ?? 0} ₽</td>
                  <td>{STATUS_LABELS[order.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.orders.length === 0 && <p className="empty">Нет заказов за эту смену.</p>}
    </div>
  );
}
