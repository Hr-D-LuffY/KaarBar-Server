import httpStatus from "http-status";
import type { Prisma } from "../generated/prisma/client";
import { AppError } from "../utils/AppError";

export type DueParty = "vendor" | "customer";

type PartyTarget = {
  shopId: string;
  partyId: string;
};

const PARTY_LABEL: Record<DueParty, string> = { vendor: "Vendor", customer: "Customer" };

const partyWhere = ({ shopId, partyId }: PartyTarget) => ({
  id: partyId,
  shopId,
  deletedAt: null,
});

// One conditional UPDATE (due >= amount), so a payment can't overpay even when sent twice
const decrementDue = async (
  tx: Prisma.TransactionClient,
  party: DueParty,
  target: PartyTarget,
  amount: Prisma.Decimal,
) => {
  const where = { ...partyWhere(target), due: { gte: amount } };
  const data = { due: { decrement: amount } };
  const { count } =
    party === "vendor"
      ? await tx.vendor.updateMany({ where, data })
      : await tx.customer.updateMany({ where, data });
  return count;
};

const readDue = async (tx: Prisma.TransactionClient, party: DueParty, target: PartyTarget) => {
  const where = partyWhere(target);
  const select = { due: true };
  const row =
    party === "vendor"
      ? await tx.vendor.findFirst({ where, select })
      : await tx.customer.findFirst({ where, select });
  return row?.due ?? null;
};

export const applyPayment = async (
  tx: Prisma.TransactionClient,
  party: DueParty,
  target: PartyTarget,
  amount: Prisma.Decimal,
) => {
  const label = PARTY_LABEL[party];
  const updated = await decrementDue(tx, party, target, amount);

  if (updated === 0) {
    if ((await readDue(tx, party, target)) === null) {
      throw new AppError(httpStatus.NOT_FOUND, `${label} not found`);
    }
    throw new AppError(httpStatus.CONFLICT, "Payment cannot be more than the current due");
  }

  const due = await readDue(tx, party, target);
  if (due === null) throw new AppError(httpStatus.NOT_FOUND, `${label} not found`);
  return due;
};
