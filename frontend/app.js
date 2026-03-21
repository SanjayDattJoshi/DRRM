// API Base URL — matches your backend server.js PORT
const API_URL = 'http://localhost:3000';

// State
let centers = [];
let areas   = [];
let roads   = [];

// ══════════════════════════════════════════════════
//  NETWORK OVERVIEW MAP
// ══════════════════════════════════════════════════

let networkMap       = null;
let centerLayer      = null;
let areaLayer        = null;
let routeLayer       = null;
const mapLayerState  = { centers: true, areas: true, routes: true };

// Coordinate lookup keyed by location_id (centers: id, areas: id+1000)
// This mirrors the routing engine's convention exactly.
const locCoords = {};

function initMap() {
  if (networkMap) return; // already initialised

  networkMap = L.map('networkMap', {
    center: [27.18, 78.00],
    zoom: 11,
    zoomControl: true,
    attributionControl: false
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(networkMap);

  centerLayer = L.layerGroup().addTo(networkMap);
  areaLayer   = L.layerGroup().addTo(networkMap);
  routeLayer  = L.layerGroup().addTo(networkMap);
}

// ── Custom SVG icon factory ────────────────────────────────────────────────
function makeMapIcon(fillColor, glowColor, pulse) {
  const sz = pulse ? 48 : 36;
  const pulseAnim = pulse ? `
    <circle cx="12" cy="12" r="9" fill="none" stroke="${glowColor}" stroke-width="1.5" opacity="0.6">
      <animate attributeName="r" values="9;20" dur="1.8s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.6;0" dur="1.8s" repeatCount="indefinite"/>
    </circle>` : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}" viewBox="0 0 24 24">
    ${pulseAnim}
    <circle cx="12" cy="12" r="8" fill="${fillColor}" opacity="0.25"/>
    <circle cx="12" cy="12" r="5" fill="${fillColor}"/>
    <circle cx="12" cy="12" r="5" fill="none" stroke="${glowColor}" stroke-width="1.5"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [sz, sz],
    iconAnchor: [sz / 2, sz / 2],
    popupAnchor: [0, -(sz / 2)]
  });
}

const MAP_ICONS = {
  center:      makeMapIcon('rgba(52,199,89,0.9)',   '#34c759', false),
  area_high:   makeMapIcon('rgba(255,45,85,0.9)',   '#ff2d55', true),
  area_medium: makeMapIcon('rgba(255,149,0,0.9)',   '#ff9500', false),
  area_low:    makeMapIcon('rgba(0,122,255,0.9)',    '#007aff', false),
};

function areaIcon(score) {
  if (score >= 0.7) return MAP_ICONS.area_high;
  if (score >= 0.4) return MAP_ICONS.area_medium;
  return MAP_ICONS.area_low;
}

function priorityBadgeClass(score) {
  if (score >= 0.7) return 'priority-high';
  if (score >= 0.4) return 'priority-medium';
  return 'priority-low';
}

// ── Render functions ───────────────────────────────────────────────────────
function renderMapCenters(data) {
  if (!centerLayer) return;
  centerLayer.clearLayers();
  data.forEach(c => {
    if (!c.latitude || !c.longitude) return;
    locCoords[c.id] = [c.latitude, c.longitude];            // graph key = c.id
    const popup = `
      <div class="map-popup-title center-popup">⛺ ${c.name}</div>
      <div class="map-popup-row"><span>ID</span><strong>#${c.id}</strong></div>
      <div class="map-popup-row"><span>🍱 Food</span><strong>${c.total_food_kits}</strong></div>
      <div class="map-popup-row"><span>💧 Water</span><strong>${c.total_water_units}</strong></div>
      <div class="map-popup-row"><span>🏥 Medical</span><strong>${c.total_medical_kits}</strong></div>`;
    L.marker([c.latitude, c.longitude], { icon: MAP_ICONS.center })
      .bindPopup(popup, { maxWidth: 220 })
      .addTo(centerLayer);
  });
  document.getElementById('mapStatCenters').textContent = data.length;
}

function renderMapAreas(data) {
  if (!areaLayer) return;
  areaLayer.clearLayers();
  data.forEach(a => {
    if (!a.latitude || !a.longitude) return;
    locCoords[a.id + 1000] = [a.latitude, a.longitude];    // graph key = id+1000
    const score = a.priority_score || 0;
    const badge = score > 0
      ? `<span class="priority-badge ${priorityBadgeClass(score)}">${score}</span>` : '';
    const popup = `
      <div class="map-popup-title area-popup">🚨 ${a.name}</div>
      <div class="map-popup-row"><span>ID</span><strong>#${a.id}</strong></div>
      <div class="map-popup-row"><span>👥 People</span><strong>${a.people_count.toLocaleString()}</strong></div>
      <div class="map-popup-row"><span>⚠️ Severity</span><strong>${a.severity}/5</strong></div>
      <div class="map-popup-row"><span>🚧 Access</span><strong>${a.access_difficulty ? 'Difficult' : 'Easy'}</strong></div>
      ${badge ? `<div style="margin-top:8px">${badge}</div>` : ''}`;
    L.marker([a.latitude, a.longitude], { icon: areaIcon(score) })
      .bindPopup(popup, { maxWidth: 220 })
      .addTo(areaLayer);
  });
  document.getElementById('mapStatAreas').textContent = data.length;
}

function renderMapRoads(data) {
  if (!routeLayer) return;
  routeLayer.clearLayers();
  let open = 0, blocked = 0;

  data.forEach(r => {
    // Resolve coordinates: centers use r.from_location_id as-is; 
    // areas in the roads table are stored as id+1000 (e.g. 1001, 1002...)
    // This matches the convention in database.js sample data exactly.
    const fromCoord = locCoords[r.from_location_id];
    const toCoord   = locCoords[r.to_location_id];
    if (!fromCoord || !toCoord) return;

    if (r.is_blocked) {
      blocked++;
      L.polyline([fromCoord, toCoord], {
        color: '#ff2d55', weight: 2.5, opacity: 0.7, dashArray: '7 7'
      }).bindTooltip(`🚫 Road #${r.id} — BLOCKED`, { sticky: true })
        .addTo(routeLayer);
    } else {
      open++;
      L.polyline([fromCoord, toCoord], {
        color: '#007aff', weight: 2.5, opacity: 0.65
      }).bindTooltip(`Road #${r.id} — ${r.distance_km} km · ${r.travel_time_minutes} min`, { sticky: true })
        .addTo(routeLayer);
    }
  });

  document.getElementById('mapStatRoads').textContent   = open;
  document.getElementById('mapStatBlocked').textContent = blocked;
}

// ── Public map controls ────────────────────────────────────────────────────
function toggleMapLayer(name) {
  mapLayerState[name] = !mapLayerState[name];
  const layerMap = { centers: centerLayer, areas: areaLayer, routes: routeLayer };
  if (mapLayerState[name]) {
    networkMap.addLayer(layerMap[name]);
  } else {
    networkMap.removeLayer(layerMap[name]);
  }
}

function mapFitAll() {
  const coords = [];
  centers.forEach(c => { if (c.latitude) coords.push([c.latitude, c.longitude]); });
  areas.forEach(a =>   { if (a.latitude) coords.push([a.latitude, a.longitude]); });
  if (coords.length > 0 && networkMap) {
    networkMap.fitBounds(coords, { padding: [40, 40] });
  }
}

async function refreshMap() {
  initMap();
  // Re-use the already-loaded state arrays (centers / areas / roads)
  // so the map always reflects whatever the data lists show.
  renderMapCenters(centers);
  renderMapAreas(areas);
  // Roads need coords resolved, so render areas first (they populate locCoords).
  renderMapRoads(roads);
}

// ══════════════════════════════════════════════════
//  INITIALISE
// ══════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  updateLastUpdated();
  setInterval(updateLastUpdated, 1000);

  // Load data → this also refreshes the map
  loadCenters();
  loadAreas();
  loadRoads();

  setupFormHandlers();
});

// ══════════════════════════════════════════════════
//  TAB NAVIGATION
// ══════════════════════════════════════════════════

function initializeTabs() {
  const tabs        = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === targetTab) content.classList.add('active');
      });

      if (targetTab === 'routing')    populateRouteSelects();
      if (targetTab === 'simulation') populateSimulationSelects();

      // When the dashboard tab is re-activated, trigger a map resize so tiles
      // fill the container properly (Leaflet needs this after display:none).
      if (targetTab === 'dashboard' && networkMap) {
        setTimeout(() => networkMap.invalidateSize(), 50);
      }
    });
  });
}

// ══════════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════════

function updateLastUpdated() {
  document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
}

async function apiRequest(endpoint, method = 'GET', data = null) {
  try {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (data && method !== 'GET') options.body = JSON.stringify(data);
    const response = await fetch(`${API_URL}${endpoint}`, options);
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, error: error.message };
  }
}

function getPriorityLevel(score) {
  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

// ══════════════════════════════════════════════════
//  DATA LOADERS  (each one also refreshes the map)
// ══════════════════════════════════════════════════

async function loadCenters() {
  const result = await apiRequest('/centers');
  if (result.success) {
    centers = result.data;
    displayCenters(centers);
    initMap();
    renderMapCenters(centers);
    // Re-render roads in case coords were missing before
    if (roads.length) renderMapRoads(roads);
  }
}

async function loadAreas() {
  const result = await apiRequest('/areas');
  if (result.success) {
    areas = result.data;
    displayAreas(areas);
    initMap();
    renderMapAreas(areas);
    if (roads.length) renderMapRoads(roads);
  }
}

async function loadRoads() {
  const result = await apiRequest('/roads');
  if (result.success) {
    roads = result.data;
    displayRoads(roads);
    initMap();
    renderMapRoads(roads);
  }
}

// ══════════════════════════════════════════════════
//  DISPLAY HELPERS
// ══════════════════════════════════════════════════

function displayCenters(data) {
  const container = document.getElementById('centersList');
  if (!data.length) {
    container.innerHTML = '<p style="color:var(--text-muted)">No relief centers found</p>';
    return;
  }
  container.innerHTML = data.map(c => `
    <div class="data-item">
      <strong>${c.name}</strong> (ID: ${c.id})<br>
      📍 ${c.latitude}, ${c.longitude}<br>
      🍱 Food: ${c.total_food_kits} | 💧 Water: ${c.total_water_units} | 🏥 Medical: ${c.total_medical_kits}
    </div>`).join('');
}

function displayAreas(data) {
  const container = document.getElementById('areasList');
  if (!data.length) {
    container.innerHTML = '<p style="color:var(--text-muted)">No affected areas found</p>';
    return;
  }
  container.innerHTML = data.map(a => `
    <div class="data-item">
      <strong>${a.name}</strong> (ID: ${a.id})<br>
      📍 ${a.latitude}, ${a.longitude}<br>
      👥 People: ${a.people_count} | ⚠️ Severity: ${a.severity}/5 | 🚧 Access: ${a.access_difficulty === 1 ? 'Difficult' : 'Easy'}<br>
      ${a.priority_score > 0
        ? `<span class="priority-badge priority-${getPriorityLevel(a.priority_score)}">Priority: ${a.priority_score}</span>`
        : ''}
    </div>`).join('');
}

function displayRoads(data) {
  const container = document.getElementById('roadsList');
  if (!data.length) {
    container.innerHTML = '<p style="color:var(--text-muted)">No roads found</p>';
    return;
  }
  container.innerHTML = data.map(r => `
    <div class="data-item" style="border-left-color:${r.is_blocked ? 'var(--emergency-red)' : 'var(--safe-green)'}">
      <strong>Road ${r.id}</strong>: ${r.from_location_id} ↔ ${r.to_location_id}<br>
      📏 ${r.distance_km} km | ⏱️ ${r.travel_time_minutes} min |
      ${r.is_blocked
        ? '🚫 <strong style="color:var(--emergency-red)">BLOCKED</strong>'
        : '✅ Open'}
    </div>`).join('');
}

// ══════════════════════════════════════════════════
//  PRIORITY & ALLOCATION
// ══════════════════════════════════════════════════

async function computePriorities() {
  const resultContainer = document.getElementById('prioritiesResult');
  resultContainer.innerHTML = '<div class="loading"></div> Computing priorities...';

  const result = await apiRequest('/compute-priorities', 'POST');

  if (result.success) {
    const sorted = result.data.sort((a, b) => b.priority_score - a.priority_score);

    resultContainer.innerHTML = `
      <h3 style="margin-bottom:15px;color:var(--safe-green)">✓ Priority Computation Complete</h3>
      <table class="table">
        <thead><tr>
          <th>Rank</th><th>Area Name</th><th>Priority Score</th>
          <th>People</th><th>Severity</th><th>Access</th>
        </tr></thead>
        <tbody>
          ${sorted.map((area, i) => `
            <tr>
              <td><strong>${i + 1}</strong></td>
              <td>${area.name}</td>
              <td><span class="priority-badge priority-${getPriorityLevel(area.priority_score)}">${area.priority_score}</span></td>
              <td>${area.people_count}</td>
              <td>${area.severity}/5</td>
              <td>${area.access_difficulty === 1 ? 'Hard' : 'Easy'}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;

    // Reload areas so map markers update with new priority colours
    await loadAreas();
  } else {
    resultContainer.innerHTML = `<p style="color:var(--emergency-red)">Error: ${result.error || result.message}</p>`;
  }
}

async function allocateResources() {
  const resultContainer = document.getElementById('allocationResult');
  resultContainer.innerHTML = '<div class="loading"></div> Computing allocations...';

  const result = await apiRequest('/allocate-resources', 'POST');

  if (result.success) {
    const d = result.data;
    resultContainer.innerHTML = `
      <h3 style="margin-bottom:15px;color:var(--safe-green)">✓ Resource Allocation Complete</h3>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:20px">
        ${['food', 'water', 'medical'].map((type, i) => {
          const labels = ['FOOD KITS', 'WATER UNITS', 'MEDICAL KITS'];
          const avail  = [d.totalAvailable.food, d.totalAvailable.water, d.totalAvailable.medical];
          const req    = [d.totalRequired.food,  d.totalRequired.water,  d.totalRequired.medical];
          const ratio  = [d.ratios.food,          d.ratios.water,         d.ratios.medical];
          const col    = ratio[i] >= 1 ? 'var(--safe-green)' : 'var(--alert-orange)';
          return `
            <div style="padding:15px;background:var(--bg-tertiary);border-radius:8px">
              <div style="font-size:.85rem;color:var(--text-muted);margin-bottom:5px">${labels[i]}</div>
              <div style="font-size:1.3rem;font-weight:700">${avail[i]} / ${req[i]}</div>
              <div style="font-size:.9rem;color:${col}">${(ratio[i]*100).toFixed(1)}% fulfillment</div>
            </div>`;
        }).join('')}
      </div>
      <table class="table">
        <thead><tr>
          <th>Area</th><th>Priority</th>
          <th>Food (Alloc/Req)</th><th>Water (Alloc/Req)</th><th>Medical (Alloc/Req)</th>
        </tr></thead>
        <tbody>
          ${d.allocations.map(a => `
            <tr>
              <td><strong>${a.area_name}</strong></td>
              <td><span class="priority-badge priority-${getPriorityLevel(a.priority_score)}">${a.priority_score}</span></td>
              <td>${a.allocated.food_kits} / ${a.required.food_kits}</td>
              <td>${a.allocated.water_units} / ${a.required.water_units}</td>
              <td>${a.allocated.medical_kits} / ${a.required.medical_kits}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } else {
    resultContainer.innerHTML = `<p style="color:var(--emergency-red)">Error: ${result.error || result.message}</p>`;
  }
}

// ══════════════════════════════════════════════════
//  ROUTING
// ══════════════════════════════════════════════════

function populateRouteSelects() {
  const cs = centers.map(c => `<option value="${c.id}">${c.name} (ID: ${c.id})</option>`).join('');
  const as = areas.map(a   => `<option value="${a.id}">${a.name} (ID: ${a.id})</option>`).join('');

  document.getElementById('routeCenterId').innerHTML     = cs;
  document.getElementById('routeAreaId').innerHTML       = as;
  document.getElementById('multiRouteCenterId').innerHTML = cs;
  document.getElementById('multiAreaSelect').innerHTML   = areas.map(a => `
    <label class="checkbox-label">
      <input type="checkbox" name="areaId" value="${a.id}">
      ${a.name} (ID: ${a.id})
    </label>`).join('');
}

async function findRoute(event) {
  event.preventDefault();
  const centerId = document.getElementById('routeCenterId').value;
  const areaId   = document.getElementById('routeAreaId').value;
  const useTime  = document.getElementById('routeUseTime').checked;
  const rc       = document.getElementById('routeResult');
  rc.innerHTML   = '<div class="loading"></div> Computing route...';

  const result = await apiRequest(`/routes?centerId=${centerId}&areaId=${areaId}&useTime=${useTime}`);

  if (result.success) {
    rc.innerHTML = `
      <h3 style="margin-bottom:15px;color:var(--safe-green)">✓ Route Found</h3>
      <div class="route-path">${buildRoutePath(result.route)}</div>
      <div style="margin-top:15px;padding:15px;background:var(--bg-tertiary);border-radius:8px">
        <strong>Total ${result.metric === 'km' ? 'Distance' : 'Time'}:</strong> ${result.totalDistance} ${result.metric}
      </div>`;
  } else {
    rc.innerHTML = `<p style="color:var(--emergency-red)">${result.message || 'Error computing route'}</p>`;
  }
}

async function findMultiRoute(event) {
  event.preventDefault();
  const centerId = document.getElementById('multiRouteCenterId').value;
  const useTime  = document.getElementById('multiRouteUseTime').checked;
  const areaIds  = Array.from(document.querySelectorAll('#multiAreaSelect input:checked')).map(cb => parseInt(cb.value));

  if (!areaIds.length) { alert('Please select at least one area'); return; }

  const rc = document.getElementById('multiRouteResult');
  rc.innerHTML = '<div class="loading"></div> Computing multi-stop route...';

  const result = await apiRequest('/routes/multi-stop', 'POST', { centerId: parseInt(centerId), areaIds, useTime });

  if (result.success) {
    rc.innerHTML = `
      <h3 style="margin-bottom:15px;color:var(--safe-green)">✓ Multi-Stop Route Planned</h3>
      <div class="route-path" style="flex-wrap:wrap">${buildRoutePath(result.route)}</div>
      <div style="margin-top:15px;padding:15px;background:var(--bg-tertiary);border-radius:8px">
        <strong>Stops:</strong> ${result.stopsCount}<br>
        <strong>Total ${result.metric === 'km' ? 'Distance' : 'Time'}:</strong> ${result.totalDistance} ${result.metric}
      </div>`;
  } else {
    rc.innerHTML = `<p style="color:var(--emergency-red)">${result.message || 'Error computing route'}</p>`;
  }
}

function buildRoutePath(route) {
  return route.map((node, i) => {
    const cls   = node.type === 'center' ? 'center' : 'area';
    const arrow = i < route.length - 1 ? '<span class="route-arrow">→</span>' : '';
    return `<div class="route-node ${cls}">${node.name}</div>${arrow}`;
  }).join('');
}

// ══════════════════════════════════════════════════
//  SIMULATION
// ══════════════════════════════════════════════════

function populateSimulationSelects() {
  const sel = document.getElementById('simRoadId');
  sel.innerHTML = '<option value="">-- No road change --</option>' +
    roads.map(r => `<option value="${r.id}">Road ${r.id}: ${r.from_location_id} ↔ ${r.to_location_id}</option>`).join('');
}

async function runSimulation(event) {
  event.preventDefault();
  const roadId  = document.getElementById('simRoadId').value;
  const blocked = document.getElementById('simBlocked').value === 'true';

  if (!roadId) { alert('Please select a road to modify'); return; }

  const rc = document.getElementById('simulationResult');
  rc.innerHTML = '<div class="loading"></div> Running simulation...';

  const result = await apiRequest('/simulate', 'POST', { roadId: parseInt(roadId), blocked });

  if (result.success) {
    const top5 = result.results.priorities.slice(0, 5);
    rc.innerHTML = `
      <h3 style="margin-bottom:15px;color:var(--safe-green)">✓ Simulation Complete</h3>
      <div style="padding:15px;background:var(--bg-tertiary);border-radius:8px;margin-bottom:20px">
        <strong>Scenario:</strong> Road ${roadId} is ${blocked ? 'BLOCKED' : 'UNBLOCKED'}
      </div>
      <h4 style="margin-bottom:10px">Impact on Priorities:</h4>
      <table class="table">
        <thead><tr><th>Rank</th><th>Area</th><th>Priority Score</th><th>People</th><th>Severity</th></tr></thead>
        <tbody>
          ${top5.map((area, i) => `
            <tr>
              <td><strong>${i + 1}</strong></td>
              <td>${area.name}</td>
              <td><span class="priority-badge priority-${getPriorityLevel(area.priority_score)}">${area.priority_score}</span></td>
              <td>${area.people_count}</td>
              <td>${area.severity}/5</td>
            </tr>`).join('')}
        </tbody>
      </table>`;

    // Refresh map to show any road-status changes
    await loadRoads();
  } else {
    rc.innerHTML = `<p style="color:var(--emergency-red)">Error: ${result.error || result.message}</p>`;
  }
}

// ══════════════════════════════════════════════════
//  FORM HANDLERS
// ══════════════════════════════════════════════════

function setupFormHandlers() {
  document.getElementById('routeForm').addEventListener('submit', findRoute);
  document.getElementById('multiRouteForm').addEventListener('submit', findMultiRoute);
  document.getElementById('simulationForm').addEventListener('submit', runSimulation);

  // Add Center
  document.getElementById('addCenterForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.latitude         = parseFloat(data.latitude);
    data.longitude        = parseFloat(data.longitude);
    data.total_food_kits  = parseInt(data.total_food_kits);
    data.total_water_units = parseInt(data.total_water_units);
    data.total_medical_kits = parseInt(data.total_medical_kits);

    const result = await apiRequest('/centers', 'POST', data);
    if (result.success) {
      alert('Relief center added successfully!');
      e.target.reset();
      await loadCenters();
    } else {
      alert('Error: ' + (result.error || result.message));
    }
  });

  // Add Area
  document.getElementById('addAreaForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.latitude          = parseFloat(data.latitude);
    data.longitude         = parseFloat(data.longitude);
    data.people_count      = parseInt(data.people_count);
    data.severity          = parseInt(data.severity);
    data.access_difficulty = parseInt(data.access_difficulty);
    data.required_food_kits   = parseInt(data.required_food_kits);
    data.required_water_units = parseInt(data.required_water_units);
    data.required_medical_kits = parseInt(data.required_medical_kits);

    const result = await apiRequest('/areas', 'POST', data);
    if (result.success) {
      alert('Affected area added successfully!');
      e.target.reset();
      await loadAreas();
    } else {
      alert('Error: ' + (result.error || result.message));
    }
  });

  // Add Road
  document.getElementById('addRoadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.from_location_id   = parseInt(data.from_location_id);
    data.to_location_id     = parseInt(data.to_location_id);
    data.distance_km        = parseFloat(data.distance_km);
    data.travel_time_minutes = parseInt(data.travel_time_minutes);
    data.is_blocked         = data.is_blocked === 'on';

    const result = await apiRequest('/roads', 'POST', data);
    if (result.success) {
      alert('Road connection added successfully!');
      e.target.reset();
      await loadRoads();
    } else {
      alert('Error: ' + (result.error || result.message));
    }
  });
}
