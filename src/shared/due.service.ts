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

const updateDue = async (
  tx: Prisma.TransactionClient,
  party: DueParty,
  where: Prisma.CustomerWhereInput & Prisma.VendorWhereInput,
  data: { due: { increment: Prisma.Decimal } | { decrement: Prisma.Decimal } },
) => {
  const { count } =
    party === "vendor"
      ? await tx.vendor.updateMany({ where, data })
      : await tx.customer.updateMany({ where, data });
  return count;
};

// One conditional UPDATE (due >= amount), so a payment can't overpay even when sent twice
const decrementDue = (
  tx: Prisma.TransactionClient,
  party: DueParty,
  target: PartyTarget,
  amount: Prisma.Decimal,
) =>
  updateDue(
    tx,
    party,
    { ...partyWhere(target), due: { gte: amount } },
    { due: { decrement: amount } },
  );

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

// Raises the due for a credit purchase or sale; the party must exist in this shop
export const addDue = async (
  tx: Prisma.TransactionClient,
  party: DueParty,
  target: PartyTarget,
  amount: Prisma.Decimal,
) => {
  const count = await updateDue(tx, party, partyWhere(target), { due: { increment: amount } });
  if (count === 0) throw new AppError(httpStatus.NOT_FOUND, `${PARTY_LABEL[party]} not found`);
};

// Takes back the unpaid part of a cancelled sale. It may go below zero (credit) and still works
// on a removed party, so an old order can always be cancelled
export const cancelDue = async (
  tx: Prisma.TransactionClient,
  party: DueParty,
  { shopId, partyId }: PartyTarget,
  amount: Prisma.Decimal,
) => {
  const count = await updateDue(tx, party, { id: partyId, shopId }, { due: { decrement: amount } });
  if (count === 0) throw new AppError(httpStatus.NOT_FOUND, `${PARTY_LABEL[party]} not found`);
};
