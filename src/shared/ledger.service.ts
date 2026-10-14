import type { Prisma } from "../generated/prisma/client";
import { formatMoney } from "../utils/money";
import { buildPaginationMeta, getPagination, type PaginationQuery } from "../utils/pagination";

type LedgerEntryBase = {
  id: string;
  createdAt: Date;
  // What the entry did to the due: positive raises it, negative lowers it
  change: Prisma.Decimal;
};

// The current due is the balance after the newest entry; walking back undoes one entry at a time
export const paginateLedger = <Entry extends LedgerEntryBase>(
  currentDue: Prisma.Decimal,
  entries: Entry[],
  pagination: PaginationQuery,
) => {
  const newestFirst = [...entries].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id),
  );

  let balance = currentDue;
  const ledger = newestFirst.map(({ change, ...entry }) => {
    const row = { ...entry, change: formatMoney(change), balance: formatMoney(balance) };
    balance = balance.minus(change);
    return row;
  });

  const { skip, take } = getPagination(pagination);
  return {
    entries: ledger.slice(skip, skip + take),
    meta: buildPaginationMeta({ ...pagination, total: ledger.length }),
  };
};
