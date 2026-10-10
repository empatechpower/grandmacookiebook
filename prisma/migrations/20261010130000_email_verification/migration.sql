-- Email verification for new sign-ups. Accounts that already exist are treated as verified.
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "verifyEmailSentAt" TIMESTAMP(3);
UPDATE "User" SET "emailVerifiedAt" = NOW();
