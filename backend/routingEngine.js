'use strict';

/**
 * Build an undirected adjacency list from road documents.
 * Blocked roads are excluded.
 *
 * @param {Array}  roads     – Road documents from DB
 * @param {boolean} useTime  – true → weight = travel_time_minutes, false → distance_km
 * @returns {Map<number, Array<{node: number, weight: number}>>}
 */
function buildGraph(roads, useTime = false) {
  const graph = new Map();

  for (const road of roads) {
    if (road.is_blocked) continue;

    const weight = useTime ? road.travel_time_minutes : road.distance_km;
    const a = road.from_location_id;
    const b = road.to_location_id;

    if (!graph.has(a)) graph.set(a, []);
    if (!graph.has(b)) graph.set(b, []);

    graph.get(a).push({ node: b, weight });
    graph.get(b).push({ node: a, weight });
  }

  return graph;
}

/**
 * Dijkstra's shortest-path algorithm.
 *
 * @param {Map}    graph     – adjacency list (from buildGraph)
 * @param {number} startNode
 * @param {number} endNode
 * @returns {{ path: number[], totalWeight: number, found: boolean }}
 */
function dijkstra(graph, startNode, endNode) {
  const dist = new Map();
  const prev = new Map();
  const visited = new Set();

  // Initialise all known nodes with Infinity
  for (const node of graph.keys()) {
    dist.set(node, Infinity);
  }
  dist.set(startNode, 0);

  // Simple priority queue using an array (suitable for small graphs)
  const pq = [{ node: startNode, dist: 0 }];

  while (pq.length > 0) {
    // Pop the node with the smallest tentative distance
    pq.sort((a, b) => a.dist - b.dist);
    const { node: u } = pq.shift();

    if (visited.has(u)) continue;
    visited.add(u);

    if (u === endNode) break;

    const neighbors = graph.get(u) || [];
    for (const { node: v, weight } of neighbors) {
      if (visited.has(v)) continue;
      const alt = (dist.get(u) || 0) + weight;
      if (alt < (dist.get(v) || Infinity)) {
        dist.set(v, alt);
        prev.set(v, u);
        pq.push({ node: v, dist: alt });
      }
    }
  }

  // Reconstruct path
  if (!dist.has(endNode) || dist.get(endNode) === Infinity) {
    return { path: [], totalWeight: Infinity, found: false };
  }

  const path = [];
  let current = endNode;
  while (current !== undefined) {
    path.unshift(current);
    current = prev.get(current);
  }

  return { path, totalWeight: dist.get(endNode), found: path[0] === startNode };
}

/**
 * Multi-stop route planner using the Nearest Neighbour heuristic (TSP approximation).
 *
 * Steps:
 *  1. Start at relief center (centerId)
 *  2. Find the closest unvisited area (by Dijkstra shortest weight)
 *  3. Travel there, mark visited
 *  4. Repeat until all areas visited
 *  5. Return total cost and ordered visit sequence
 *
 * @param {Map}    graph     – adjacency list
 * @param {number} centerId  – starting node (relief center ID)
 * @param {number[]} areaIds – area graph IDs (area.id + 1000)
 * @returns {{ order: number[], segments: object[], totalWeight: number }}
 */
function findMultiStopRoute(graph, centerId, areaIds) {
  if (!areaIds || areaIds.length === 0) {
    return { order: [centerId], segments: [], totalWeight: 0 };
  }

  const unvisited = new Set(areaIds);
  const order = [centerId];
  const segments = [];
  let totalWeight = 0;
  let current = centerId;

  while (unvisited.size > 0) {
    let bestNode = null;
    let bestWeight = Infinity;
    let bestPath = [];

    for (const areaId of unvisited) {
      const result = dijkstra(graph, current, areaId);
      if (result.found && result.totalWeight < bestWeight) {
        bestWeight = result.totalWeight;
        bestNode = areaId;
        bestPath = result.path;
      }
    }

    if (bestNode === null) {
      // No reachable unvisited area — mark remaining as unreachable
      for (const id of unvisited) {
        segments.push({ from: current, to: id, path: [], weight: null, reachable: false });
      }
      break;
    }

    unvisited.delete(bestNode);
    order.push(bestNode);
    totalWeight += bestWeight;
    segments.push({ from: current, to: bestNode, path: bestPath, weight: bestWeight, reachable: true });
    current = bestNode;
  }

  return { order, segments, totalWeight };
}

module.exports = { buildGraph, dijkstra, findMultiStopRoute };
