import type { Prisma } from "../generated/prisma/client";

export const ActivityAction = {
  VENDOR_PAYMENT: "VENDOR_PAYMENT",
  CUSTOMER_PAYMENT: "CUSTOMER_PAYMENT",
  RESTOCK_CREATE: "RESTOCK_CREATE",
  ORDER_CREATE: "ORDER_CREATE",
  ORDER_CANCEL: "ORDER_CANCEL",
} as const;

export const ActivityEntity = {
  VENDOR: "VENDOR",
  CUSTOMER: "CUSTOMER",
  RESTOCK: "RESTOCK",
  ORDER: "ORDER",
} as const;

type LogActivityInput = {
  shopId: string;
  userId: string;
  action: (typeof ActivityAction)[keyof typeof ActivityAction];
  entityType: (typeof ActivityEntity)[keyof typeof ActivityEntity];
  entityId: string;
  details?: Prisma.InputJsonObject;
};

// Takes the caller's transaction client so the log row commits or rolls back with the change it records
export const logActivity = (
  tx: Prisma.TransactionClient,
  { shopId, userId, action, entityType, entityId, details }: LogActivityInput,
) => tx.activityLog.create({ data: { shopId, userId, action, entityType, entityId, details } });
