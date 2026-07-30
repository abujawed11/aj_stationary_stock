function getPagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildMeta(page, limit, total) {
  return { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) };
}

module.exports = { getPagination, buildMeta };
