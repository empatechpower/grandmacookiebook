-- Author's starting visit fee on their profile (shown on Find Authors cards).
ALTER TABLE "User" ADD COLUMN "visitFeeFrom" INTEGER;
-- New bulk tiers (client): 10–24 20%, 25–49 30%, 50–99 50%, 100+ custom quote. Tier 1 and 2 starts stay;
-- clear any saved tier-2 discount so the new defaults take effect only if they were never customised.
