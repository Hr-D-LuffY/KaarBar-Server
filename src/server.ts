import app from "./app";
import { config } from "./config";

const main = async () => {
  app.listen(config.port, () => {
    console.log(`Kaarbaar server listening on port ${config.port}`);
  });
};

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
