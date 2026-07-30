function pad(num, len) {
  return String(num).padStart(len, "0");
}

function formatDateForNumber(date = new Date()) {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1, 2);
  const d = pad(date.getDate(), 2);
  return `${y}${m}${d}`;
}

async function generateDocumentNumber(delegate, field, prefix, date = new Date()) {
  const fullPrefix = `${prefix}-${formatDateForNumber(date)}-`;
  const count = await delegate.count({ where: { [field]: { startsWith: fullPrefix } } });
  return `${fullPrefix}${pad(count + 1, 4)}`;
}

module.exports = { generateDocumentNumber };
