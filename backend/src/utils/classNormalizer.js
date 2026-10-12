/**
 * Class Details Normalization Utility
 * Normalizes course, semester, and division values (trimmed and uppercased)
 * across onboarding, profile updates, assignment creation, and queries
 * so class matching never fails due to casing or whitespace differences.
 */

function normalizeClassValue(val) {
  if (!val || typeof val !== 'string') return '';
  return val.trim().toUpperCase();
}

function normalizeClassDetails(data = {}) {
  return {
    course: normalizeClassValue(data.course),
    semester: normalizeClassValue(data.semester),
    division: normalizeClassValue(data.division)
  };
}

module.exports = {
  normalizeClassValue,
  normalizeClassDetails
};
