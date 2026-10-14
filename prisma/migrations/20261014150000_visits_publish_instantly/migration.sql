-- Visit listings no longer need admin approval (client): publish everything waiting for review.
UPDATE "VisitPackage" SET "status" = 'APPROVED', "reviewNote" = NULL WHERE "status" = 'PENDING';
