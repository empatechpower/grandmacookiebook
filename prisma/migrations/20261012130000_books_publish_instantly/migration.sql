-- Books no longer need admin approval: anything waiting for review goes live now.
UPDATE "Book" SET "status" = 'APPROVED', "reviewNote" = NULL WHERE "status" = 'PENDING';
