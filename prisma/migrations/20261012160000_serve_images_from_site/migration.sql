-- Images are now served by the site itself at /uploads/<folder>/<file> (read from the bucket),
-- so saved bucket addresses — including ones saved with a placeholder host — are rewritten to that path.
UPDATE "Book"      SET "coverUrl"  = regexp_replace("coverUrl",  '^https?://[^/]*r2\.dev/', '/uploads/') WHERE "coverUrl"  ~ '^https?://[^/]*r2\.dev/(avatars|covers|media)/';
UPDATE "BookImage" SET "url"       = regexp_replace("url",       '^https?://[^/]*r2\.dev/', '/uploads/') WHERE "url"       ~ '^https?://[^/]*r2\.dev/(avatars|covers|media)/';
UPDATE "User"      SET "avatarUrl" = regexp_replace("avatarUrl", '^https?://[^/]*r2\.dev/', '/uploads/') WHERE "avatarUrl" ~ '^https?://[^/]*r2\.dev/(avatars|covers|media)/';
UPDATE "Media"     SET "url"       = regexp_replace("url",       '^https?://[^/]*r2\.dev/', '/uploads/') WHERE "url"       ~ '^https?://[^/]*r2\.dev/(avatars|covers|media)/';
UPDATE "Article"   SET "coverUrl"  = regexp_replace("coverUrl",  '^https?://[^/]*r2\.dev/', '/uploads/') WHERE "coverUrl"  ~ '^https?://[^/]*r2\.dev/(avatars|covers|media)/';
