const db = require('./db');
const { buildReceiptPng } = require('./receiptImage');

const MSK_OFFSET_HOURS = 3;

const SLOTS = [
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

  const buffer = await buildReceiptPng(report);
  await bot.sendDocument(
    chatId,
    buffer,
    `receipt-${shiftDate}.png`,
    `Чек смены ${shiftDate}`,
    { disable_notification: true },
  );
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
