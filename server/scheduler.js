const db = require('./db');

const MSK_OFFSET_HOURS = 3;
const FIRE_HOUR_MSK = 23;
const FIRE_MIN_MSK = 55;
const FIRE_HOUR_UTC = FIRE_HOUR_MSK - MSK_OFFSET_HOURS;

function getNextRunMs(now = new Date()) {
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    FIRE_HOUR_UTC,
    FIRE_MIN_MSK,
    0,
    0,
  ));
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - now.getTime();
}

function getMoscowDateStr(now = new Date()) {
  const msk = new Date(now.getTime() + MSK_OFFSET_HOURS * 3600 * 1000);
  return msk.toISOString().slice(0, 10);
}

function formatReceiptText(report) {
  const SEP = '--------------------------------';
  const lines = [];
  lines.push('        КАФЕ');
  lines.push(SEP);
  lines.push(`Смена: ${report.date}`);
  lines.push(SEP);

  if (report.summary.length > 0) {
    lines.push('СВОДКА');
    for (const item of report.summary) {
      const left = `${item.name} x${item.count}`;
      const right = `${item.revenue} P`;
      lines.push(padRow(left, right));
    }
    lines.push(SEP);
  }

  lines.push(padRow('ИТОГО', `${report.totalRevenue} P`));
  lines.push(padRow('Заказов', String(report.totalOrders)));
  lines.push(padRow('Выполнено', String(report.completedOrders)));
  lines.push(SEP);
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

async function sendEndOfDayReport(bot) {
  const chatId = process.env.CAFE_CHAT_ID;
  if (!chatId) return;
  if (!bot.enabled) return;

  const shiftDate = getMoscowDateStr();

  if (await db.wasShiftReportSent(shiftDate)) {
    console.log(`Shift report for ${shiftDate} already sent — skipping`);
    return;
  }

  const report = await db.getShiftReport(shiftDate);
  if (report.totalOrders === 0) {
    console.log(`No orders on ${shiftDate} — skipping auto-send`);
    return;
  }

  const text = `<pre>${escapeHtml(formatReceiptText(report))}</pre>`;
  await bot.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    disable_notification: true,
  });
  await db.markShiftReportSent(shiftDate);
  console.log(`Shift report for ${shiftDate} sent to cafe chat`);
}

function startScheduler(bot) {
  if (!process.env.CAFE_CHAT_ID) {
    console.warn('CAFE_CHAT_ID not set — end-of-day auto-send disabled.');
    return;
  }
  if (!bot.enabled) {
    console.warn('Bot disabled — end-of-day auto-send disabled.');
    return;
  }

  const schedule = () => {
    const ms = getNextRunMs();
    console.log(`Next end-of-day report scheduled in ${Math.round(ms / 60000)} min`);
    setTimeout(async () => {
      try {
        await sendEndOfDayReport(bot);
      } catch (err) {
        console.error('End-of-day report failed:', err);
      }
      schedule();
    }, ms);
  };

  schedule();
}

module.exports = { startScheduler };
