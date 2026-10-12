-- Stripe's processing fee is now deducted from the author's share (client decision).
ALTER TABLE "OrderItem" ADD COLUMN "stripeFee" INTEGER;
ALTER TABLE "Booking" ADD COLUMN "stripeFee" INTEGER;
