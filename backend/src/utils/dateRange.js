const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function pad(num, len) {
  return String(num).padStart(len, "0");
}

function toIstParts(date) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate() };
}

function getIstDayRange(date = new Date()) {
  const { y, m, d } = toIstParts(date);
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - IST_OFFSET_MS);
  const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - IST_OFFSET_MS);
  return { start, end };
}

function getIstMonthRange(date = new Date()) {
  const { y, m } = toIstParts(date);
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0) - IST_OFFSET_MS);
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999) - IST_OFFSET_MS);
  return { start, end };
}

function istDateKey(date) {
  const { y, m, d } = toIstParts(new Date(date));
  return `${y}-${pad(m + 1, 2)}-${pad(d, 2)}`;
}

module.exports = { getIstDayRange, getIstMonthRange, istDateKey };
