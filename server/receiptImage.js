const { createCanvas, loadImage } = require('@napi-rs/canvas');

// Coin SVG mirrored from client/src/components/Coin.jsx (lucide "coins" icon).
// Rendered as an inline image next to monetary amounts.
const COIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M13.744 17.736a6 6 0 1 1-7.48-7.48"/>
  <path d="M15 6h1v4"/>
  <path d="m6.134 14.768.866-.5 2 3.464"/>
  <circle cx="16" cy="8" r="6"/>
</svg>`;

let coinImagePromise = null;
function getCoinImage() {
  if (!coinImagePromise) {
    coinImagePromise = loadImage(Buffer.from(COIN_SVG));
  }
  return coinImagePromise;
}

const WIDTH = 420;
const PAD_X = 24;
const PAD_TOP = 24;
const PAD_BOTTOM = 24;
const LINE_HEIGHT = 22;
const SECTION_GAP = 8;
const FONT_SIZE = 14;
const FONT_TITLE = `bold 16px "DejaVu Sans Mono", "Liberation Mono", "Courier New", monospace`;
const FONT_BODY = `${FONT_SIZE}px "DejaVu Sans Mono", "Liberation Mono", "Courier New", monospace`;
const FONT_BOLD = `bold ${FONT_SIZE}px "DejaVu Sans Mono", "Liberation Mono", "Courier New", monospace`;
const COIN_SIZE = 16;
const COIN_GAP = 4;

function buildLines(report) {
  const lines = [];

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

  lines.push({ kind: 'header', text: 'КАФЕ' });
  lines.push({ kind: 'separator' });
  lines.push({ kind: 'date', text: `Смена: ${report.date}` });
  lines.push({ kind: 'separator' });

  lines.push({ kind: 'title', text: 'ИТОГИ' });
  lines.push({ kind: 'row', left: 'Заказов', right: String(report.totalOrders) });
  lines.push({ kind: 'row', left: 'Позиций', right: String(totalItems) });
  lines.push({ kind: 'row', left: 'ИТОГО', right: String(report.totalRevenue), coin: true, bold: true });
  lines.push({ kind: 'separator' });

  if (sortedSummary.length > 0) {
    lines.push({ kind: 'title', text: 'ПОЗИЦИИ' });
    for (const item of sortedSummary) {
      lines.push({ kind: 'row', left: item.name, right: String(item.count) });
    }
    lines.push({ kind: 'separator' });
  }

  if (customers.length > 0) {
    lines.push({ kind: 'title', text: 'КЛИЕНТЫ' });
    for (const c of customers) {
      lines.push({ kind: 'row', left: c.name, right: String(c.total), coin: true });
    }
    lines.push({ kind: 'separator' });
  }

  lines.push({ kind: 'footer', text: 'СПАСИБО!' });

  return lines;
}

async function buildReceiptPng(report) {
  const lines = buildLines(report);
  const height = PAD_TOP + lines.length * LINE_HEIGHT + PAD_BOTTOM;

  const canvas = createCanvas(WIDTH, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH, height);

  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'alphabetic';

  const coinImage = await getCoinImage();
  let y = PAD_TOP + FONT_SIZE;

  for (const line of lines) {
    if (line.kind === 'header' || line.kind === 'footer') {
      ctx.font = FONT_TITLE;
      ctx.textAlign = 'center';
      ctx.fillText(line.text, WIDTH / 2, y);
    } else if (line.kind === 'separator') {
      ctx.font = FONT_BODY;
      ctx.textAlign = 'left';
      ctx.fillText('-'.repeat(34), PAD_X, y);
    } else if (line.kind === 'date') {
      ctx.font = FONT_BODY;
      ctx.textAlign = 'left';
      ctx.fillText(line.text, PAD_X, y);
    } else if (line.kind === 'title') {
      ctx.font = FONT_BOLD;
      ctx.textAlign = 'left';
      ctx.fillText(line.text, PAD_X, y);
    } else if (line.kind === 'row') {
      ctx.font = line.bold ? FONT_BOLD : FONT_BODY;
      ctx.textAlign = 'left';
      ctx.fillText(line.left, PAD_X, y);

      ctx.textAlign = 'right';
      const rightEdge = WIDTH - PAD_X;
      if (line.coin) {
        const coinY = y - COIN_SIZE + 3;
        ctx.drawImage(coinImage, rightEdge - COIN_SIZE, coinY, COIN_SIZE, COIN_SIZE);
        ctx.fillText(line.right, rightEdge - COIN_SIZE - COIN_GAP, y);
      } else {
        ctx.fillText(line.right, rightEdge, y);
      }
    }
    y += LINE_HEIGHT;
  }

  return canvas.toBuffer('image/png');
}

module.exports = { buildReceiptPng };
