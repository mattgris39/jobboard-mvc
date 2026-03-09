export function toPositiveInt(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}

export function buildPagination({ total, page, pageSize }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  return {
    total,
    page: safePage,
    pageSize,
    totalPages,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
    prevPage: safePage > 1 ? safePage - 1 : 1,
    nextPage: safePage < totalPages ? safePage + 1 : totalPages
  };
}
