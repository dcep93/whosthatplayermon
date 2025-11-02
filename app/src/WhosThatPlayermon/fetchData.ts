const fetchData = `
You have web access. Fetch live NFL rosters from ESPN and output JSON with 300 objects sorted by descending probability.

Output (JSON only, no prose): an array of 300 objects. Each object must be:
{
  "Player": "<full name>",
  "Team": "<ESPN team abbreviation>",
  "Position": "<QB|RB|WR|TE|OT|G|C|EDGE|DT|LB|CB|S|K|P|LS|RS>",
  "ProBowlProb": <float 0..1>,
  "affiliationVerifiedAt": "<ISO-8601 timestamp>"
}
Return nothing but that JSON array.

Data sources (must be fetched during this run):
- Teams list (enumerate team IDs): https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams
- Per-team athletes (season 2025): https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/teams/{TEAM_ID}/athletes?limit=400
  Then GET each items[].$ref (athlete), and resolve team.$ref to obtain the team abbreviation.

Affiliation requirements (no exceptions):
1) Authoritative team: For every player you output, resolve team.$ref → GET team object → read abbreviation. Do not infer.
2) Live-only: Pull teams and athletes now (no cached lists). If any request fails, retry with exponential backoff (max 3).
3) Active players only: Keep athletes where status.type.name == "active" (or status missing). Exclude FAs or entries lacking a resolved abbreviation.
4) Double-verify: After selecting the top 300, re-GET each player’s team.$ref and re-confirm abbreviation. If it changed or is null, update the object (and affiliationVerifiedAt) or drop and replace with the next candidate.
5) Deduplication: Normalize to a base name (strip parentheticals like “(alt)”/role variants) and keep one object per player—the highest probability.

Scoring → ProBowlProb (transparent):
- Compute a blended score, then map linearly to [0,1] after min–max normalization within position group and conference.
  • 30% recent honors proxy (Pro Bowl/All-Pro/first-team votes if available; else proxy with games started + team wins)
  • 40% current-season performance (position metrics & usage; QB: TD/INT/Y/A; RB: touches/YFS/TD; WR/TE: targets/yards/TD; OL: team sacks allowed proxy; DEF: sacks/pressures/INT/PD/TFL; K/P: FG%/XPA/net)
  • 15% team strength/visibility (wins, primetime proxy)
  • 10% role & snap share (depth chart rank, snap rate)
  • 5% fan signal (market/engagement proxy)
- Do not enforce Pro Bowl roster quotas—return the top 300 by probability.

Validation/quality gates before printing JSON:
- If abbreviation cannot be resolved after two retries with 500–1000 ms backoff, exclude the athlete.
- Ensure exactly 300 objects.
- Sort strictly by ProBowlProb descending.
- Populate affiliationVerifiedAt with the timestamp of the final team.$ref re-check for that player.

Output format:
- Print a single JSON array (no markdown fences, no commentary).

`;
export default fetchData;
