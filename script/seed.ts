import { db } from "../server/db";
import { users } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");
  await db.insert(users).values([
    { username: "teacher1", password: "password", role: "teacher" },
    { username: "student1", password: "password", role: "student" },
  ]).onConflictDoNothing();
  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});