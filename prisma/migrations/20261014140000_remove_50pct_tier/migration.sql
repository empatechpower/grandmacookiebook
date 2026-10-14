-- Client: remove the 50% (50–99 copies) bulk tier. Turns it off even if it was saved in Settings.
UPDATE "Setting" SET "value" = '0' WHERE "key" = 'bulkTier3Pct';
