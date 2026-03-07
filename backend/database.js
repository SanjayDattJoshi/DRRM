'use strict';

const mongoose = require('mongoose');

// ─── Schemas ─────────────────────────────────────────────────────────────────

const reliefCenterSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  total_food_kits: { type: Number, default: 0 },
  total_water_units: { type: Number, default: 0 },
  total_medical_kits: { type: Number, default: 0 }
});

const affectedAreaSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  people_count: { type: Number, default: 0 },
  severity: { type: Number, min: 1, max: 5, default: 1 },
  access_difficulty: { type: Number, min: 0, max: 1, default: 0 },
  required_food_kits: { type: Number, default: 0 },
  required_water_units: { type: Number, default: 0 },
  required_medical_kits: { type: Number, default: 0 },
  priority_score: { type: Number, default: 0 }
});

const roadSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  from_location_id: { type: Number, required: true },
  to_location_id: { type: Number, required: true },
  distance_km: { type: Number, required: true },
  travel_time_minutes: { type: Number, required: true },
  is_blocked: { type: Boolean, default: false }
});

// ─── Models ───────────────────────────────────────────────────────────────────

const ReliefCenter = mongoose.model('ReliefCenter', reliefCenterSchema);
const AffectedArea = mongoose.model('AffectedArea', affectedAreaSchema);
const Road = mongoose.model('Road', roadSchema);

// ─── Seed Data ────────────────────────────────────────────────────────────────

const seedData = {
  centers: [
    {
      id: 1,
      name: 'Central Relief Hub',
      latitude: 27.1767,
      longitude: 78.0081,
      total_food_kits: 500,
      total_water_units: 1000,
      total_medical_kits: 200
    },
    {
      id: 2,
      name: 'North District Warehouse',
      latitude: 27.25,
      longitude: 78.1,
      total_food_kits: 300,
      total_water_units: 500,
      total_medical_kits: 100
    }
  ],
  areas: [
    {
      id: 1,
      name: 'Flood Zone A',
      latitude: 27.15,
      longitude: 77.95,
      people_count: 250,
      severity: 5,
      access_difficulty: 1,
      required_food_kits: 200,
      required_water_units: 400,
      required_medical_kits: 100,
      priority_score: 0
    },
    {
      id: 2,
      name: 'Village Beta',
      latitude: 27.2,
      longitude: 78.05,
      people_count: 150,
      severity: 3,
      access_difficulty: 0,
      required_food_kits: 100,
      required_water_units: 200,
      required_medical_kits: 50,
      priority_score: 0
    },
    {
      id: 3,
      name: 'Landslide Area C',
      latitude: 27.22,
      longitude: 78.12,
      people_count: 400,
      severity: 4,
      access_difficulty: 1,
      required_food_kits: 300,
      required_water_units: 600,
      required_medical_kits: 150,
      priority_score: 0
    }
  ],
  // from_location_id: center ID (1, 2) or area graph ID (area.id + 1000)
  roads: [
    { id: 1, from_location_id: 1,    to_location_id: 2,    distance_km: 15,  travel_time_minutes: 25,  is_blocked: false },
    { id: 2, from_location_id: 1,    to_location_id: 1001, distance_km: 10,  travel_time_minutes: 20,  is_blocked: false },
    { id: 3, from_location_id: 1,    to_location_id: 1002, distance_km: 8,   travel_time_minutes: 15,  is_blocked: false },
    { id: 4, from_location_id: 2,    to_location_id: 1002, distance_km: 12,  travel_time_minutes: 22,  is_blocked: false },
    { id: 5, from_location_id: 2,    to_location_id: 1003, distance_km: 9,   travel_time_minutes: 18,  is_blocked: false },
    { id: 6, from_location_id: 1001, to_location_id: 1003, distance_km: 14,  travel_time_minutes: 30,  is_blocked: true  },
    { id: 7, from_location_id: 1002, to_location_id: 1003, distance_km: 11,  travel_time_minutes: 20,  is_blocked: false }
  ]
};

// ─── Connection & Seeding ─────────────────────────────────────────────────────

async function connectDatabase() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/disaster_relief';
  await mongoose.connect(uri);
  console.log('MongoDB connected');
  await seedIfEmpty();
}

async function seedIfEmpty() {
  const centerCount = await ReliefCenter.countDocuments();
  if (centerCount > 0) return;

  console.log('Seeding initial data…');
  await ReliefCenter.insertMany(seedData.centers);
  await AffectedArea.insertMany(seedData.areas);
  await Road.insertMany(seedData.roads);
  console.log('Seed data inserted.');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Return the next available integer ID for a model that has an `id` field.
 */
async function nextId(Model) {
  const last = await Model.findOne().sort({ id: -1 }).lean();
  return last ? last.id + 1 : 1;
}

module.exports = { connectDatabase, ReliefCenter, AffectedArea, Road, nextId };
