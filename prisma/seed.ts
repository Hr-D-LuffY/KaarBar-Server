import bcrypt from "bcryptjs";
import { z } from "zod";
import { config } from "../src/config";
import { Role } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";

const CATEGORY_NAMES = [
  "Paper",
  "Carbon paper",
  "Art paper",
  "Card",
  "Sticker",
  "Color",
  "Glue",
];

const STARTER_UNITS = [
  { name: "Sheet", symbol: "pc", decimalPlaces: 0 },
  { name: "Piece", symbol: "pc", decimalPlaces: 0 },
  { name: "Pound", symbol: "lb", decimalPlaces: 2 },
  { name: "Liter", symbol: "L", decimalPlaces: 2 },
];

const seedConfigSchema = z.object({
  superAdminEmail: z.string(),
  superAdminPassword: z.string(),
  superAdminName: z.string(),
  ownerEmail: z.string(),
  ownerPassword: z.string(),
  ownerName: z.string(),
  ownerPhone: z.string(),
  shopName: z.string(),
  shopPhone: z.string(),
  shopAddress: z.string(),
});

const readSeedConfig = () => {
  const parsed = seedConfigSchema.safeParse(config.seed);
  if (!parsed.success) {
    throw new Error(`Missing seed values in .env (SEED_*):\n${z.prettifyError(parsed.error)}`);
  }

  const seed = parsed.data;
  return {
    superAdmin: {
      email: seed.superAdminEmail,
      password: seed.superAdminPassword,
      name: seed.superAdminName,
    },
    owner: {
      email: seed.ownerEmail,
      password: seed.ownerPassword,
      name: seed.ownerName,
      phone: seed.ownerPhone,
    },
    shop: { shopName: seed.shopName, phone: seed.shopPhone, address: seed.shopAddress },
  };
};

type SeedConfig = ReturnType<typeof readSeedConfig>;

const seedCategories = async () => {
  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
};

const seedUnits = async () => {
  for (const unit of STARTER_UNITS) {
    await prisma.unit.upsert({ where: { name: unit.name }, update: {}, create: unit });
  }
};

const seedSuperAdmin = async (superAdmin: SeedConfig["superAdmin"]) => {
  const { password, ...profile } = superAdmin;
  const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);
  await prisma.user.upsert({
    where: { email: profile.email },
    update: {},
    create: { ...profile, passwordHash, role: Role.SUPER_ADMIN },
  });
};

// Skipped when the owner already exists, so re-running never creates a second shop
const seedShopAndOwner = async ({ owner, shop }: SeedConfig) => {
  const existingOwner = await prisma.user.findUnique({ where: { email: owner.email } });
  if (existingOwner) return;

  const { password, ...profile } = owner;
  const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);
  await prisma.shop.create({
    data: {
      ...shop,
      users: { create: { ...profile, passwordHash, role: Role.OWNER } },
    },
  });
};

const main = async () => {
  const seedConfig = readSeedConfig();

  await seedCategories();
  await seedUnits();
  await seedSuperAdmin(seedConfig.superAdmin);
  await seedShopAndOwner(seedConfig);

  console.log("Seed complete");
};

main()
  .catch((error) => {
    console.error("Seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
