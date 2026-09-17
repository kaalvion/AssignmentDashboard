/**
 * Deterministic Rule-Based Smart Study Planner Service
 * Takes active assignments, calculates remaining workload & priority, 
 * distributes workload across available days, and generates actionable daily study plans.
 */

function generateStudyPlan(assignments, availableDaysCount = 7, maxDailyHours = 4.0) {
  const now = new Date();
  
  // 1. Filter out completed assignments
  const activeAssignments = assignments.filter(a => a.status !== 'COMPLETED');

  // 2. Map remaining hours & sort by priority_score descending
  const itemsToPlan = activeAssignments.map(a => {
    const remainingHours = Math.max(0.25, Number((a.estimated_hours * (1 - (a.progress / 100))).toFixed(1)));
    const dueDate = new Date(a.deadline);
    const daysUntilDue = Math.max(1, Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    return {
      assignmentId: a.id,
      title: a.title,
      subjectName: a.subject_name || 'General',
      priorityLevel: a.priority_level,
      priorityScore: a.priority_score,
      totalRemainingHours: remainingHours,
      unallocatedHours: remainingHours,
      daysUntilDue,
      deadline: a.deadline
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);

  // 3. Prepare day slots
  const days = [];
  for (let i = 0; i < availableDaysCount; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    days.push({
      dateStr: date.toISOString().split('T')[0],
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      totalAllocatedHours: 0,
      tasks: []
    });
  }

  let totalRequiredHours = 0;
  itemsToPlan.forEach(item => {
    totalRequiredHours += item.totalRemainingHours;
  });

  // 4. Rule-Based Allocation Algorithm
  itemsToPlan.forEach(item => {
    const maxDayIndex = Math.min(availableDaysCount - 1, Math.max(0, item.daysUntilDue - 1));
    
    // Chunk work into max 1.5h sessions
    while (item.unallocatedHours > 0.05) {
      let bestDayIndex = -1;
      let minLoad = Infinity;

      // Find the least loaded day up to the assignment's due date
      for (let d = 0; d <= maxDayIndex; d++) {
        if (days[d].totalAllocatedHours < maxDailyHours && days[d].totalAllocatedHours < minLoad) {
          minLoad = days[d].totalAllocatedHours;
          bestDayIndex = d;
        }
      }

      // If all days up to deadline hit maxDailyHours limit, pick the absolute lowest loaded day regardless of limit
      if (bestDayIndex === -1) {
        for (let d = 0; d <= maxDayIndex; d++) {
          if (days[d].totalAllocatedHours < minLoad) {
            minLoad = days[d].totalAllocatedHours;
            bestDayIndex = d;
          }
        }
      }

      if (bestDayIndex === -1) bestDayIndex = 0;

      const sessionHours = Math.min(item.unallocatedHours, 1.5);
      const roundedSession = Number(sessionHours.toFixed(1));

      days[bestDayIndex].tasks.push({
        assignmentId: item.assignmentId,
        title: item.title,
        subjectName: item.subjectName,
        allocatedHours: roundedSession,
        priorityLevel: item.priorityLevel,
        deadline: item.deadline
      });

      days[bestDayIndex].totalAllocatedHours = Number((days[bestDayIndex].totalAllocatedHours + roundedSession).toFixed(1));
      item.unallocatedHours = Number((item.unallocatedHours - roundedSession).toFixed(1));
    }
  });

  // 5. Calculate Warnings & Total Capacity
  const totalAvailableCapacity = availableDaysCount * maxDailyHours;
  let warning = null;

  if (totalRequiredHours > totalAvailableCapacity) {
    warning = {
      type: 'OVERLOAD',
      message: `Workload Warning: You have ${totalRequiredHours.toFixed(1)} hours of estimated work but only ${totalAvailableCapacity.toFixed(1)} study hours available before your nearest deadlines.`
    };
  }

  return {
    totalRequiredHours: Number(totalRequiredHours.toFixed(1)),
    availableDaysCount,
    maxDailyHours,
    warning,
    days
  };
}

module.exports = {
  generateStudyPlan
};
