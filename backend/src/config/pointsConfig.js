/**
 * Points and Penalty Configuration
 * Nexus Assignment Dashboard
 */

const POINTS_CONFIG = {
  DEFAULT_MAX_POINTS: 50,
  ON_TIME_RATIO: 1.0,         // +100%
  EARLY_BONUS_RATIO: 0.3,     // +30% if >= 24h before deadline
  LATE_RATIO: 0.2,            // +20%
  MISSED_PENALTY_RATIO: 0.4,  // -40%
  EARLY_BONUS_WINDOW_MS: 24 * 60 * 60 * 1000 // 24 hours
};

/**
 * Calculates submission points based on assignment maxPoints, status, and submission timing.
 */
function calculateSubmissionPoints(maxPoints = 50, status, submittedAt, deadline) {
  const baseMax = Number(maxPoints) > 0 ? Number(maxPoints) : POINTS_CONFIG.DEFAULT_MAX_POINTS;
  const subDate = new Date(submittedAt);
  const deadDate = new Date(deadline);

  if (status === 'ON_TIME') {
    const isEarly = (deadDate.getTime() - subDate.getTime()) >= POINTS_CONFIG.EARLY_BONUS_WINDOW_MS;
    const basePoints = Math.round(baseMax * POINTS_CONFIG.ON_TIME_RATIO);
    const earlyBonus = isEarly ? Math.round(baseMax * POINTS_CONFIG.EARLY_BONUS_RATIO) : 0;
    return {
      points: basePoints + earlyBonus,
      basePoints,
      earlyBonus,
      isEarly,
      type: 'ON_TIME'
    };
  } else if (status === 'LATE') {
    const points = Math.round(baseMax * POINTS_CONFIG.LATE_RATIO);
    return {
      points,
      basePoints: points,
      earlyBonus: 0,
      isEarly: false,
      type: 'LATE'
    };
  }

  return { points: 0, basePoints: 0, earlyBonus: 0, isEarly: false, type: 'UNKNOWN' };
}

/**
 * Calculates missed assignment penalty (always positive deduction value).
 */
function calculateMissedPenalty(maxPoints = 50) {
  const baseMax = Number(maxPoints) > 0 ? Number(maxPoints) : POINTS_CONFIG.DEFAULT_MAX_POINTS;
  return Math.round(baseMax * POINTS_CONFIG.MISSED_PENALTY_RATIO);
}

module.exports = {
  POINTS_CONFIG,
  calculateSubmissionPoints,
  calculateMissedPenalty
};
