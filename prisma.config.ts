import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // In Prisma 7, the migration tool uses the URL defined here.
    // Since we are running migrations, point this to your unpooled DIRECT_URL.
    url: env("DIRECT_URL"),
  },
});