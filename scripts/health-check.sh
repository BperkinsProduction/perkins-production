#!/bin/bash
# Health check for perkinsproduction.com
# Usage: bash scripts/health-check.sh [site-url]
# Defaults to production. Pass a Vercel preview URL to check a deploy before it goes live.

SITE="${1:-https://www.perkinsproduction.com}"
SITE="${SITE%/}"
PASS=0
FAIL=0

check() {
    local label="$1"
    local ok="$2"
    if [ "$ok" = "yes" ]; then
        echo "  PASS  $label"
        PASS=$((PASS + 1))
    else
        echo "  FAIL  $label"
        FAIL=$((FAIL + 1))
    fi
}

status_of() {
    curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$1"
}

media_ok() {
    local headers status content_type content_length
    headers=$(curl -sSIL --max-time 15 "$1" 2>/dev/null) || return 1
    status=$(echo "$headers" | awk '/^HTTP\// { code=$2 } END { print code }')
    content_type=$(echo "$headers" | awk -F': *' 'tolower($1)=="content-type" { value=tolower($2) } END { gsub("\r", "", value); print value }')
    content_length=$(echo "$headers" | awk -F': *' 'tolower($1)=="content-length" { value=$2 } END { gsub("\r", "", value); print value }')

    [ "$status" = "200" ] \
        && [[ "$content_type" == video/mp4* ]] \
        && [[ "$content_length" =~ ^[0-9]+$ ]] \
        && [ "$content_length" -ge 100000 ]
}

echo "Perkins Production health check: $(date '+%Y-%m-%d %H:%M')"
echo ""

# Pages
[ "$(status_of "$SITE/")" = "200" ] && ok=yes || ok=no
check "Homepage responds" $ok

body=$(curl -s --max-time 15 "$SITE/")
echo "$body" | grep -q "PERKINS" && ok=yes || ok=no
check "Homepage content looks right" $ok

# Astro may bundle page scripts into /_astro/*.js files, so search those too
code="$body"
for src in $(echo "$body" | grep -o '<script[^>]*src="/[^"]*"' | sed 's/.*src="\([^"]*\)"/\1/' | grep -v '^/_vercel/'); do
    code="$code
$(curl -s --max-time 15 "$SITE$src")"
done

[ "$(status_of "$SITE/admin.html")" = "200" ] && ok=yes || ok=no
check "Admin page responds" $ok
[ "$(status_of "$SITE/admin")" = "200" ] && ok=yes || ok=no
check "Admin short link (/admin rewrite) responds" $ok
[ "$(status_of "$SITE/api/auth")" = "401" ] && ok=yes || ok=no
check "Admin API rejects anonymous access" $ok

# Photo API
images=$(curl -s --max-time 15 "$SITE/api/images" | python3 -c "import json,sys; print(len(json.load(sys.stdin).get('images', {})))" 2>/dev/null)
[ -n "$images" ] && [ "$images" -ge 10 ] && ok=yes || ok=no
check "Photo API returns images ($images found)" $ok

# Hero reel videos
for clip in wedding-featured wedding-details wedding-firstdance portrait-engagement portrait-senior portrait-creative wedding-ceremony wedding-reception; do
    media_ok "$SITE/reel/$clip.mp4" && ok=yes || ok=no
    check "Hero clip: $clip" $ok
done

# Contact form wiring
echo "$code" | grep -q "formsubmit.co/ajax" && ok=yes || ok=no
check "Contact form endpoint configured" $ok
echo "$code" | grep -q "_autoresponse" && ok=yes || ok=no
check "Auto-reply configured" $ok

# SEO files
[ "$(status_of "$SITE/sitemap.xml")" = "200" ] && ok=yes || ok=no
check "Sitemap serving" $ok
[ "$(status_of "$SITE/robots.txt")" = "200" ] && ok=yes || ok=no
check "Robots file serving" $ok
echo "$body" | grep -q "application/ld+json" && ok=yes || ok=no
check "LocalBusiness structured data present" $ok

# Matterport tour
[ "$(status_of "https://my.matterport.com/show/?m=9zKWY8ZmbjB")" = "200" ] && ok=yes || ok=no
check "Matterport tour reachable" $ok

# Latest deploy (only if GitHub CLI is available)
if command -v gh >/dev/null 2>&1; then
    state=$(gh api repos/bperkins-WLR/perkins-production/commits/main/status -q '.state' 2>/dev/null)
    [ "$state" = "success" ] && ok=yes || ok=no
    check "Latest Vercel deploy ($state)" $ok
fi

echo ""
echo "Result: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && echo "All systems go." || echo "Something needs attention. Ask Claude to investigate."
exit $FAIL
