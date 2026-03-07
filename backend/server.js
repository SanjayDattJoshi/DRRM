'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const rateLimit = require('express-rate-limit');

const { connectDatabase, ReliefCenter, AffectedArea, Road, nextId } = require('./database');
const { computeAllPriorities, allocateResources } = require('./priorityScorer');
const { buildGraph, dijkstra, findMultiStopRoute } = require('./routingEngine');

const app = express();
app.use(cors());
app.use(express.json());

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                  // requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// ─── Root ─────────────────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    name: 'Disaster Relief Resource Routing API',
    version: '1.0.0',
    endpoints: {
      centers: '/centers',
      areas: '/areas',
      roads: '/roads',
      priorities: 'POST /compute-priorities',
      allocation: 'POST /allocate-resources',
      route: 'GET /routes?centerId=X&areaId=Y&useTime=true',
      multiStop: 'POST /routes/multi-stop',
      simulate: 'POST /simulate'
    }
  });
});

// ─── Relief Centers ───────────────────────────────────────────────────────────

app.get('/centers', async (_req, res) => {
  try {
    const centers = await ReliefCenter.find().sort({ id: 1 }).lean();
    res.json(centers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/centers/:id', async (req, res) => {
  try {
    const center = await ReliefCenter.findOne({ id: Number(req.params.id) }).lean();
    if (!center) return res.status(404).json({ error: 'Center not found' });
    res.json(center);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/centers', async (req, res) => {
  try {
    const id = await nextId(ReliefCenter);
    const center = await ReliefCenter.create({ id, ...req.body });
    res.status(201).json(center);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/centers/:id', async (req, res) => {
  try {
    const center = await ReliefCenter.findOneAndUpdate(
      { id: Number(req.params.id) },
      req.body,
      { new: true, runValidators: true }
    ).lean();
    if (!center) return res.status(404).json({ error: 'Center not found' });
    res.json(center);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/centers/:id', async (req, res) => {
  try {
    const center = await ReliefCenter.findOneAndDelete({ id: Number(req.params.id) }).lean();
    if (!center) return res.status(404).json({ error: 'Center not found' });
    res.json({ message: 'Center deleted', center });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Affected Areas ───────────────────────────────────────────────────────────

app.get('/areas', async (_req, res) => {
  try {
    const areas = await AffectedArea.find().sort({ id: 1 }).lean();
    res.json(areas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/areas/:id', async (req, res) => {
  try {
    const area = await AffectedArea.findOne({ id: Number(req.params.id) }).lean();
    if (!area) return res.status(404).json({ error: 'Area not found' });
    res.json(area);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/areas', async (req, res) => {
  try {
    const id = await nextId(AffectedArea);
    const area = await AffectedArea.create({ id, ...req.body });
    res.status(201).json(area);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/areas/:id', async (req, res) => {
  try {
    const area = await AffectedArea.findOneAndUpdate(
      { id: Number(req.params.id) },
      req.body,
      { new: true, runValidators: true }
    ).lean();
    if (!area) return res.status(404).json({ error: 'Area not found' });
    res.json(area);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/areas/:id', async (req, res) => {
  try {
    const area = await AffectedArea.findOneAndDelete({ id: Number(req.params.id) }).lean();
    if (!area) return res.status(404).json({ error: 'Area not found' });
    res.json({ message: 'Area deleted', area });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Roads ────────────────────────────────────────────────────────────────────

app.get('/roads', async (_req, res) => {
  try {
    const roads = await Road.find().sort({ id: 1 }).lean();
    res.json(roads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/roads', async (req, res) => {
  try {
    const id = await nextId(Road);
    const road = await Road.create({ id, ...req.body });
    res.status(201).json(road);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/roads/:id', async (req, res) => {
  try {
    const road = await Road.findOneAndUpdate(
      { id: Number(req.params.id) },
      req.body,
      { new: true, runValidators: true }
    ).lean();
    if (!road) return res.status(404).json({ error: 'Road not found' });
    res.json(road);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/roads/:id', async (req, res) => {
  try {
    const road = await Road.findOneAndDelete({ id: Number(req.params.id) }).lean();
    if (!road) return res.status(404).json({ error: 'Road not found' });
    res.json({ message: 'Road deleted', road });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Analytics & Planning ────────────────────────────────────────────────────

// POST /compute-priorities
app.post('/compute-priorities', async (_req, res) => {
  try {
    const areas = await AffectedArea.find().lean();
    if (areas.length === 0) return res.json({ message: 'No areas found', priorities: [] });

    const scored = computeAllPriorities(areas);

    // Persist updated scores
    await Promise.all(
      scored.map((a) => AffectedArea.findOneAndUpdate({ id: a.id }, { priority_score: a.priority_score }))
    );

    res.json({ priorities: scored });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /allocate-resources
app.post('/allocate-resources', async (_req, res) => {
  try {
    const [centers, rawAreas] = await Promise.all([
      ReliefCenter.find().lean(),
      AffectedArea.find().lean()
    ]);

    if (centers.length === 0) return res.status(400).json({ error: 'No relief centers found' });
    if (rawAreas.length === 0) return res.status(400).json({ error: 'No affected areas found' });

    // Use pre-computed priorities (compute fresh if all are zero)
    const allZero = rawAreas.every((a) => a.priority_score === 0);
    const areas = allZero ? computeAllPriorities(rawAreas) : rawAreas.slice().sort((a, b) => b.priority_score - a.priority_score);

    const result = allocateResources(centers, areas);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /routes?centerId=X&areaId=Y&useTime=true|false
app.get('/routes', async (req, res) => {
  try {
    const centerId = Number(req.query.centerId);
    const areaId = Number(req.query.areaId);
    const useTime = req.query.useTime === 'true';

    if (!centerId || !areaId) {
      return res.status(400).json({ error: 'centerId and areaId query params are required' });
    }

    const roads = await Road.find().lean();
    const graph = buildGraph(roads, useTime);

    const graphAreaId = areaId + 1000;
    const result = dijkstra(graph, centerId, graphAreaId);

    if (!result.found) {
      return res.json({
        found: false,
        message: 'No route found (road may be blocked or disconnected)',
        centerId,
        areaId,
        graphAreaId
      });
    }

    res.json({
      found: true,
      centerId,
      areaId,
      graphAreaId,
      path: result.path,
      totalWeight: result.totalWeight,
      metric: useTime ? 'minutes' : 'km'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /routes/multi-stop
// Body: { centerId: number, areaIds: number[], useTime: boolean }
app.post('/routes/multi-stop', async (req, res) => {
  try {
    const { centerId, areaIds, useTime = false } = req.body;

    if (!centerId || !Array.isArray(areaIds) || areaIds.length === 0) {
      return res.status(400).json({ error: 'centerId and non-empty areaIds array required' });
    }

    const roads = await Road.find().lean();
    const graph = buildGraph(roads, useTime);

    const graphAreaIds = areaIds.map((id) => id + 1000);
    const result = findMultiStopRoute(graph, centerId, graphAreaIds);

    res.json({
      centerId,
      areaIds,
      graphAreaIds,
      order: result.order,
      segments: result.segments,
      totalWeight: result.totalWeight,
      metric: useTime ? 'minutes' : 'km'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /simulate
// Body: { blockedRoadIds: number[], centerId: number, areaIds: number[], useTime: boolean }
app.post('/simulate', async (req, res) => {
  try {
    const { blockedRoadIds = [], centerId, areaIds = [], useTime = false } = req.body;

    const roads = await Road.find().lean();

    // Apply simulation overrides (block specified roads without modifying DB)
    const simulatedRoads = roads.map((r) => ({
      ...r,
      is_blocked: r.is_blocked || blockedRoadIds.includes(r.id)
    }));

    const graph = buildGraph(simulatedRoads, useTime);
    const areas = await AffectedArea.find().lean();
    const priorities = computeAllPriorities(areas);

    const routes = [];
    if (centerId) {
      for (const areaId of areaIds) {
        const graphAreaId = areaId + 1000;
        const result = dijkstra(graph, centerId, graphAreaId);
        routes.push({ areaId, graphAreaId, ...result });
      }
    }

    res.json({
      simulated_blocked_road_ids: blockedRoadIds,
      priorities,
      routes,
      metric: useTime ? 'minutes' : 'km'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

connectDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

module.exports = app; // for testing
