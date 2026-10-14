import type { Request, Response } from "express";
import httpStatus from "http-status";

// Proxies close idle connections, so a comment line is sent now and then to keep the stream open
const HEARTBEAT_INTERVAL_MS = 25_000;

const clientsByShop = new Map<string, Set<Response>>();

export const openStream = (shopId: string, req: Request, res: Response) => {
  res.status(httpStatus.OK).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // Stops nginx-style proxies from buffering the events
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write(": connected\n\n");

  const clients = clientsByShop.get(shopId) ?? new Set<Response>();
  clients.add(res);
  clientsByShop.set(shopId, clients);

  const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_INTERVAL_MS);

  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(res);
    if (clients.size === 0) clientsByShop.delete(shopId);
  });
};

// Call only after the transaction that produced the event has committed
export const publish = (shopId: string, event: string, data: unknown) => {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clientsByShop.get(shopId) ?? []) res.write(message);
};
