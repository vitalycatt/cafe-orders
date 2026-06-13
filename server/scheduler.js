const db = require('./db');

const MSK_OFFSET_HOURS = 3;

const SLOTS = [
  { name: 'midday', hourMsk: 12, minMsk: 40 },
  { name: 'evening', hourMsk: 23, minMsk: 55 },
];

function getNextRun(now = new Date()) {
  let best = null;
  for (const slot of SLOTS) {
    // Date.UTC handles negative hour values by rolling back the day,
    // so any MSK hour < 3 still resolves correctly.
    const candidate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      slot.hourMsk - MSK_OFFSET_HOURS,
      slot.minMsk,
      0,
      0,
    ));
    if (candidate.getTime() <= now.getTime()) {
      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
    if (!best || candidate.getTime() < best.fireAt.getTime()) {
      best = { fireAt: candidate, slot };
    }
  }
  return best;
}

function getMoscowDateStr(now = new Date()) {
  const msk = new Date(now.getTime() + MSK_OFFSET_HOURS * 3600 * 1000);
  return msk.toISOString().slice(0, 10);
}

function formatReceiptText(report) {
  const SEP = '--------------------------------';
  const totalItems = report.orders.reduce(
    (sum, order) => sum + (order.items || []).reduce((s, i) => s + i.quantity, 0),
    0,
  );
  const sortedSummary = [...report.summary].sort((a, b) => b.count - a.count);
  const customers = Object.entries(
    report.orders.reduce((acc, order) => {
      const name = order.customer_name || '—';
      acc[name] = (acc[name] || 0) + (order.total || 0);
      return acc;
    }, {}),
  )
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  const lines = [];
  lines.push('        КАФЕ');
  lines.push(SEP);
  lines.push(`Смена: ${report.date}`);
  lines.push(SEP);
  lines.push('ИТОГИ');
  lines.push(padRow('Заказов', String(report.totalOrders)));
  lines.push(padRow('Позиций', String(totalItems)));
  lines.push(padRow('ИТОГО', String(report.totalRevenue)));
  lines.push(SEP);

  if (sortedSummary.length > 0) {
    lines.push('ПОЗИЦИИ');
    for (const item of sortedSummary) {
      lines.push(padRow(item.name, String(item.count)));
    }
    lines.push(SEP);
  }

  if (customers.length > 0) {
    lines.push('КЛИЕНТЫ');
    for (const c of customers) {
      lines.push(padRow(c.name, String(c.total)));
    }
    lines.push(SEP);
  }

  lines.push('      СПАСИБО!');
  return lines.join('\n');
}

function padRow(left, right, width = 32) {
  const space = Math.max(1, width - left.length - right.length);
  return left + ' '.repeat(space) + right;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendShiftReport(bot, slotName) {
  const chatId = process.env.CAFE_CHAT_ID;
  if (!chatId) return;
  if (!bot.enabled) return;

  const shiftDate = getMoscowDateStr();

  if (await db.wasShiftReportSent(shiftDate, slotName)) {
    console.log(`Shift report ${shiftDate}/${slotName} already sent — skipping`);
    return;
  }

  const report = await db.getShiftReport(shiftDate);
  if (report.totalOrders === 0) {
    console.log(`No orders on ${shiftDate} — skipping ${slotName} auto-send`);
    return;
  }

  const text = `<pre>${escapeHtml(formatReceiptText(report))}</pre>`;
  await bot.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    disable_notification: true,
  });
  await db.markShiftReportSent(shiftDate, slotName);
  console.log(`Shift report ${shiftDate}/${slotName} sent to cafe chat`);
}

function startScheduler(bot) {
  if (!process.env.CAFE_CHAT_ID) {
    console.warn('CAFE_CHAT_ID not set — shift report auto-send disabled.');
    return;
  }
  if (!bot.enabled) {
    console.warn('Bot disabled — shift report auto-send disabled.');
    return;
  }

  const tick = () => {
    const { fireAt, slot } = getNextRun();
    const ms = fireAt.getTime() - Date.now();
    console.log(
      `Next shift report (slot=${slot.name}) scheduled in ${Math.round(ms / 60000)} min`,
    );
    setTimeout(async () => {
      try {
        await sendShiftReport(bot, slot.name);
      } catch (err) {
        console.error(`Shift report (slot=${slot.name}) failed:`, err);
      }
      tick();
    }, ms);
  };

  tick();
}

module.exports = { startScheduler };
