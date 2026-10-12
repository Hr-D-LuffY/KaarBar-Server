import app from "./app";
import { config } from "./config";
import { prisma } from "./lib/prisma";

const main = async () => {
  await prisma.$connect();
  console.log("Database connected");

  app.listen(config.port, () => {
    console.log(`Kaarbaar server listening on port ${config.port}`);
  });
};

main().catch(async (error) => {
  console.error("Failed to start server:", error);
  await prisma.$disconnect();
  process.exit(1);
});
