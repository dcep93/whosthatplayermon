const fetchData = `
#!/usr/bin/env bash
# fetch_madden_ratings.sh
# Fetches all pages of ratings from EA’s drop-api endpoint, includes required header, and outputs a JSON array of Entry objects to stdout.

set -euo pipefail

PYTHON=$(which python3 || which python)
if [ -z "$PYTHON" ]; then
  echo "Python3 not found" >&2
  exit 1
fi

$PYTHON - <<'PYCODE'
import sys, json, requests

base_url = "https://drop-api.ea.com/rating/madden-nfl"
locale = "en"
limit = 100
offset = 0

entries = []

headers = {
    "x-feature": json.dumps({"enable_next_ratings_release": True})
}

while True:
    params = {"locale": locale, "limit": limit, "offset": offset}
    resp = requests.get(base_url, params=params, headers=headers)
    resp.raise_for_status()
    j = resp.json()

    # Guessing the list path; adjust if the JSON structure differs
    # E.g., maybe j["elements"], j["ratings"], j["items"]
    items = j.get("items", [])
    if not items:
        break

    for it in items:
        entries.append({
            "playerName": it.get("firstName", ".") + " " + it.get("lastName", "."),
            "team": it.get("team", {}).get("label"),
            "position": it.get("position", {}).get("label"),
            "overallMaddenRating": int(it.get("overallRating")),
            "jerseyNum": it.get("jerseyNum"),
        })

    offset += limit
    if len(items) < limit:
        break

json.dump(entries, sys.stdout, indent=2)
PYCODE
`;
export default fetchData;
