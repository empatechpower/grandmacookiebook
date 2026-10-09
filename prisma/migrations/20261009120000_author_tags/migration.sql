-- Author tags are now #BilingualAuthors, #WomenAuthors and #MenAuthors (client request).
-- Keep "bilingual", carry "women-owned" over to "women-authors", drop the retired tags.
UPDATE "User" SET "identities" = replace("identities", ',women-owned,', ',women-authors,');
UPDATE "User" SET "identities" =
  replace(replace(replace(replace(replace("identities",
    ',black-owned,', ','), ',aapi-owned,', ','), ',hispanic-owned,', ','), ',lgbtq-owned,', ','), ',veteran-owned,', ',');
UPDATE "User" SET "identities" = '' WHERE "identities" = ',';
