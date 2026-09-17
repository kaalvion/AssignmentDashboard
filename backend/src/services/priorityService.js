/**
 * Priority and Risk Engine
 * Calculates priority score, priority level, and risk level based on PRD formula weights:
 * - Deadline urgency (hours remaining)
 * - Remaining workload (estimated_hours * (1 - progress/100))
 * - Difficulty multiplier (EASY=1, MEDIUM=1.5, HARD=2, EXTREME=2.5)
 * - Status factor (OVERDUE, COMPLETED, PENDING, IN_PROGRESS)
 */

function calculateAssignmentMetrics(assignment) {
  const {
    deadline,
    difficulty = 'MEDIUM',
    estimated_hours = 1.0,
    progress = 0,
    status = 'PENDING'
  } = assignment;

  if (status === 'COMPLETED') {
    return {
      priorityScore: 0,
      priorityLevel: 'LOW',
      riskLevel: 'SAFE'
    };
  }

  const now = new Date();
  const dueDate = new Date(deadline);
  const diffMs = dueDate.getTime() - now.getTime();
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  // If past deadline and not completed -> OVERDUE
  if (hoursRemaining <= 0) {
    return {
      priorityScore: 999,
      priorityLevel: 'CRITICAL',
      riskLevel: 'OVERDUE'
    };
  }

  // Difficulty weights
  const difficultyWeights = {
    EASY: 1.0,
    MEDIUM: 1.5,
    HARD: 2.0,
    EXTREME: 2.5
  };
  const diffWeight = difficultyWeights[difficulty] || 1.5;

  // Remaining work in hours
  const remainingHours = Math.max(0, estimated_hours * (1 - (progress / 100)));

  // Workload urgency ratio = remaining hours needed / hours available
  // If hoursRemaining is very low (e.g., 2 hours left for 4 hours of work ratio > 1)
  const urgencyRatio = remainingHours / Math.max(0.5, hoursRemaining);

  // Raw Priority Score calculation:
  // Base score from deadline closeness (1000 / (hoursRemaining + 2))
  const deadlineScore = 500 / Math.max(0.5, hoursRemaining);
  const workloadScore = remainingHours * diffWeight * 25;
  const ratioScore = urgencyRatio * 150;

  const rawScore = Math.round(deadlineScore + workloadScore + ratioScore);

  // Determine Priority Level
  let priorityLevel = 'LOW';
  if (rawScore >= 180 || hoursRemaining <= 24 || urgencyRatio >= 0.5) {
    priorityLevel = 'CRITICAL';
  } else if (rawScore >= 100 || hoursRemaining <= 72 || urgencyRatio >= 0.3) {
    priorityLevel = 'HIGH';
  } else if (rawScore >= 45 || hoursRemaining <= 168) {
    priorityLevel = 'MEDIUM';
  }

  // Determine Risk Level: SAFE, APPROACHING, URGENT, OVERDUE
  let riskLevel = 'SAFE';
  if (hoursRemaining <= 24 || urgencyRatio >= 0.6) {
    riskLevel = 'URGENT';
  } else if (hoursRemaining <= 72 || urgencyRatio >= 0.3) {
    riskLevel = 'APPROACHING';
  }

  return {
    priorityScore: rawScore,
    priorityLevel,
    riskLevel
  };
}

module.exports = {
  calculateAssignmentMetrics
};
