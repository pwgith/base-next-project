import { prisma } from "../src/lib/prisma";

async function main() {
  const email = "sub.user@example.com";

  const profile = await prisma.profile.findUnique({ where: { email } });
  if (!profile) {
    console.log("No profile found for", email);
    return;
  }

  const sub = await prisma.subscription.findUnique({
    where: { profileId: profile.id },
    include: { scheduledChange: true },
  });
  console.log("Subscription:", JSON.stringify(sub, null, 2));
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
