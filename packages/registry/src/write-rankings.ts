import { loadCatalog } from "./catalog.js";
import { defaultDerivedRoot, IDENTITY_BOARDS, PUBLIC_BOARDS, SNAPSHOT_GENERATED_AT, writeRankingSnapshots } from "./rankings.js";
import { loadPublicReviews } from "./reviews.js";
import { loadStarDay, previousStarDate, recordDailyStars } from "./stars.js";

const derivedRoot = defaultDerivedRoot();
const recorded = recordDailyStars(loadCatalog().plugins, new Date().toISOString(), derivedRoot);
const previousDate = previousStarDate(recorded.date, derivedRoot);
writeRankingSnapshots(loadCatalog(), [...PUBLIC_BOARDS, ...IDENTITY_BOARDS], SNAPSHOT_GENERATED_AT, {
  derivedRoot,
  reviews: loadPublicReviews(derivedRoot),
  starDays: {
    current: recorded.counts,
    previous: previousDate ? loadStarDay(previousDate, derivedRoot)?.counts : undefined,
  },
});
console.log(`wrote rankings to ${derivedRoot}/rankings; star day ${recorded.date} count=${Object.keys(recorded.counts).length}`);
