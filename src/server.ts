import "dotenv/config";
import app from "./app";

const port = Number(process.env.PORT);

const main = async () => {
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT is missing or invalid — set it in .env (see .env.example)");
  }

  app.listen(port, () => {
    console.log(`Kaarbaar server listening on port ${port}`);
  });
};

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
