#!/usr/bin/env bash
# Browser end-to-end tests. Builds the app, runs it against a TEST database,
# and reseeds before every suite (suites change data, e.g. passwords).
#
#   TEST_DATABASE_URL  Postgres URL whose database name contains "test" (default: local atelier_test)
#   CHROME_PATH        Chrome/Chromium binary (default: macOS Google Chrome)
#   E2E_SUITES         space-separated suite numbers to run, e.g. "01 06" (default: all)
set -euo pipefail
cd "$(dirname "$0")/.."

export TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgresql://atelier:atelier@localhost:5432/atelier_test}"
db_name="${TEST_DATABASE_URL%%\?*}"; db_name="${db_name##*/}"
[[ "$db_name" == *test* ]] || { echo "Refusing to run: TEST_DATABASE_URL must point at a database whose name contains 'test'"; exit 1; }

export DATABASE_URL="$TEST_DATABASE_URL" DATABASE_URL_UNPOOLED="$TEST_DATABASE_URL"
export E2E_ARTIFACTS="tests/e2e/.artifacts" SERVER_LOG="tests/e2e/.artifacts/server.log"
export GOOGLE_CLIENT_ID="e2e-google-client" GOOGLE_CLIENT_SECRET="e2e-google-secret"
export CRON_SECRET="e2e-cron-secret" APP_URL="http://localhost:3917" BASE_URL="http://localhost:3917"
unset STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_CONNECT_WEBHOOK_SECRET RESEND_API_KEY S3_BUCKET

rm -rf "$E2E_ARTIFACTS"; node tests/e2e/fixtures.mjs "$E2E_ARTIFACTS"
npx prisma migrate deploy >/dev/null
npm run build >/dev/null
PORT=3917 npx next start > "$SERVER_LOG" 2>&1 &
server=$!
trap 'kill $server 2>/dev/null' EXIT
for _ in $(seq 1 60); do curl -s -o /dev/null localhost:3917 && break; sleep 1; done

failed=0
for suite in tests/e2e/[0-9]*.mjs; do
  n=$(basename "$suite" | cut -c1-2)
  [[ -n "${E2E_SUITES:-}" && " $E2E_SUITES " != *" $n "* ]] && continue
  npx prisma db seed >/dev/null
  out=$(node "$suite" 2>&1) || true
  pass=$(grep -c '^PASS' <<<"$out" || true); fail=$(grep -c '^FAIL' <<<"$out" || true)
  printf '%-45s %3s passed, %s failed\n' "$(basename "$suite")" "$pass" "$fail"
  if [[ $fail -gt 0 ]] || ! grep -q '^PASS' <<<"$out" || grep -q 'Error' <<<"$(grep -v '^PASS' <<<"$out")"; then
    failed=1; grep -vE '^PASS' <<<"$out" | head -15 | sed 's/^/    /'
  fi
done
exit $failed
