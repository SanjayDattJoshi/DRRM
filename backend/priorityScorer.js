'use strict';

// ─── Weights ──────────────────────────────────────────────────────────────────
const W1 = 0.5; // severity
const W2 = 0.3; // population
const W3 = 0.2; // access difficulty

/**
 * Calculate priority score for a single area.
 *
 * P = W1*(severity/5) + W2*(people/maxPeople) + W3*access_difficulty
 *
 * @param {object} area     – Mongoose document or plain object
 * @param {number} maxPeople – Maximum people count across all areas (for normalisation)
 * @returns {number} score in [0, 1]
 */
function calculatePriorityScore(area, maxPeople) {
  const severityNorm = area.severity / 5;
  const populationNorm = maxPeople > 0 ? area.people_count / maxPeople : 0;
  const accessDiff = area.access_difficulty;
  return W1 * severityNorm + W2 * populationNorm + W3 * accessDiff;
}

/**
 * Compute priority scores for all areas and return them sorted (highest first).
 *
 * @param {Array} areas – array of area objects
 * @returns {Array} areas with updated priority_score, sorted descending
 */
function computeAllPriorities(areas) {
  if (!areas || areas.length === 0) return [];

  const maxPeople = Math.max(...areas.map((a) => a.people_count));

  return areas
    .map((area) => {
      const score = calculatePriorityScore(area, maxPeople);
      return { ...area, priority_score: parseFloat(score.toFixed(4)) };
    })
    .sort((a, b) => b.priority_score - a.priority_score);
}

/**
 * Proportionally allocate resources from centers to areas.
 *
 * Allocation Ratio = Available / Total Required
 * Allocated = Required × Ratio  (capped at required)
 *
 * @param {Array} centers – relief center objects
 * @param {Array} areas   – affected area objects (sorted by priority)
 * @returns {object} { allocations, summary }
 */
function allocateResources(centers, areas) {
  // Aggregate available resources across all centers
  const available = {
    food_kits: centers.reduce((s, c) => s + (c.total_food_kits || 0), 0),
    water_units: centers.reduce((s, c) => s + (c.total_water_units || 0), 0),
    medical_kits: centers.reduce((s, c) => s + (c.total_medical_kits || 0), 0)
  };

  // Total requirements across all areas
  const totalRequired = {
    food_kits: areas.reduce((s, a) => s + (a.required_food_kits || 0), 0),
    water_units: areas.reduce((s, a) => s + (a.required_water_units || 0), 0),
    medical_kits: areas.reduce((s, a) => s + (a.required_medical_kits || 0), 0)
  };

  // Allocation ratios (capped at 1)
  const ratios = {
    food_kits: totalRequired.food_kits > 0
      ? Math.min(1, available.food_kits / totalRequired.food_kits) : 0,
    water_units: totalRequired.water_units > 0
      ? Math.min(1, available.water_units / totalRequired.water_units) : 0,
    medical_kits: totalRequired.medical_kits > 0
      ? Math.min(1, available.medical_kits / totalRequired.medical_kits) : 0
  };

  const allocations = areas.map((area) => {
    const allocatedFood = Math.round((area.required_food_kits || 0) * ratios.food_kits);
    const allocatedWater = Math.round((area.required_water_units || 0) * ratios.water_units);
    const allocatedMedical = Math.round((area.required_medical_kits || 0) * ratios.medical_kits);

    const fulfillmentPct = (resource) => {
      const required = area[`required_${resource}`] || 0;
      if (required === 0) return 100;
      const allocated = resource === 'food_kits'
        ? allocatedFood
        : resource === 'water_units' ? allocatedWater : allocatedMedical;
      return parseFloat(((allocated / required) * 100).toFixed(1));
    };

    return {
      area_id: area.id,
      area_name: area.name,
      priority_score: area.priority_score,
      required: {
        food_kits: area.required_food_kits || 0,
        water_units: area.required_water_units || 0,
        medical_kits: area.required_medical_kits || 0
      },
      allocated: {
        food_kits: allocatedFood,
        water_units: allocatedWater,
        medical_kits: allocatedMedical
      },
      fulfillment_pct: {
        food_kits: fulfillmentPct('food_kits'),
        water_units: fulfillmentPct('water_units'),
        medical_kits: fulfillmentPct('medical_kits')
      }
    };
  });

  return {
    available_resources: available,
    total_required: totalRequired,
    allocation_ratios: {
      food_kits: parseFloat((ratios.food_kits * 100).toFixed(1)),
      water_units: parseFloat((ratios.water_units * 100).toFixed(1)),
      medical_kits: parseFloat((ratios.medical_kits * 100).toFixed(1))
    },
    allocations
  };
}

module.exports = { calculatePriorityScore, computeAllPriorities, allocateResources };
