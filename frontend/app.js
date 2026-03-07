'use strict';

const API_BASE = 'http://localhost:3000';

// ─── Cache ────────────────────────────────────────────────────────────────────
let _centers = [];
let _areas   = [];
let _roads   = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function showMsg(elId, text, type = 'success') {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = text;
  el.className = `msg ${type}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

function priorityBadge(score) {
  if (score >= 0.7) return `<span class="badge badge-high">High</span>`;
  if (score >= 0.4) return `<span class="badge badge-medium">Medium</span>`;
  return `<span class="badge badge-low">Low</span>`;
}

function fillBar(pct) {
  const color = pct >= 80 ? '#3fb950' : pct >= 50 ? '#d29922' : '#f85149';
  return `<div class="fill-bar-wrap">
    <div style="font-size:.75rem;margin-bottom:2px">${pct}%</div>
    <div class="fill-bar"><div class="fill-bar-inner" style="width:${Math.min(pct,100)}%;background:${color}"></div></div>
  </div>`;
}

function nodeLabel(id, centers, areas) {
  const center = centers.find((c) => c.id === id);
  if (center) return center.name;
  const area = areas.find((a) => a.id + 1000 === id);
  if (area) return area.name;
  return `Node ${id}`;
}

function renderRouteNodes(path, centers, areas) {
  if (!path || path.length === 0) return '<em>No path</em>';
  return path.map((nodeId, i) => {
    const isCenter = centers.some((c) => c.id === nodeId);
    const isArea   = areas.some((a) => a.id + 1000 === nodeId);
    const cls = isCenter ? 'route-node center' : isArea ? 'route-node area' : 'route-node';
    const label = nodeLabel(nodeId, centers, areas);
    const arrow = i < path.length - 1 ? '<span class="route-arrow">→</span>' : '';
    return `<span class="${cls}">${label}</span>${arrow}`;
  }).join('');
}

// ─── Data Loading ─────────────────────────────────────────────────────────────

async function loadAll() {
  try {
    [_centers, _areas, _roads] = await Promise.all([
      apiFetch('/centers'),
      apiFetch('/areas'),
      apiFetch('/roads')
    ]);
    populateDropdowns();
    updateStatus(true);
  } catch {
    updateStatus(false);
  }
}

function updateStatus(online) {
  const el = document.getElementById('statusIndicator');
  if (!el) return;
  el.textContent = online ? '● Online' : '✕ Offline';
  el.className = `status-badge ${online ? 'status-online' : 'status-offline'}`;
}

function populateDropdowns() {
  populateCenterSelects();
  populateAreaSelects();
  populateRoadSelects();
  renderMultiAreaChecks();
  renderSimChecks();
}

function populateCenterSelects() {
  const ids = ['routeCenter', 'multiCenter', 'simCenter', 'deleteCenterSelect'];
  for (const id of ids) {
    const sel = document.getElementById(id);
    if (!sel) continue;
    const val = sel.value;
    sel.innerHTML = '<option value="">-- Select center --</option>' +
      _centers.map((c) => `<option value="${c.id}">${c.name} (ID ${c.id})</option>`).join('');
    if (val) sel.value = val;
  }
}

function populateAreaSelects() {
  const ids = ['routeArea', 'deleteAreaSelect'];
  for (const id of ids) {
    const sel = document.getElementById(id);
    if (!sel) continue;
    const val = sel.value;
    sel.innerHTML = '<option value="">-- Select area --</option>' +
      _areas.map((a) => `<option value="${a.id}">${a.name} (ID ${a.id})</option>`).join('');
    if (val) sel.value = val;
  }
}

function populateRoadSelects() {
  const sel = document.getElementById('deleteRoadSelect');
  if (!sel) return;
  const val = sel.value;
  sel.innerHTML = '<option value="">-- Select road --</option>' +
    _roads.map((r) => {
      const blocked = r.is_blocked ? ' [BLOCKED]' : '';
      return `<option value="${r.id}">Road ${r.id}: ${r.from_location_id}→${r.to_location_id} (${r.distance_km}km)${blocked}</option>`;
    }).join('');
  if (val) sel.value = val;
}

function renderMultiAreaChecks() {
  const container = document.getElementById('multiAreaChecks');
  if (!container) return;
  if (_areas.length === 0) { container.innerHTML = '<p class="placeholder">No areas loaded.</p>'; return; }
  container.innerHTML = _areas.map((a) =>
    `<label class="check-item">
      <input type="checkbox" class="multiAreaCheck" value="${a.id}" />
      ${a.name}
    </label>`
  ).join('');
}

function renderSimChecks() {
  const roadContainer = document.getElementById('simRoadChecks');
  if (roadContainer) {
    if (_roads.length === 0) { roadContainer.innerHTML = '<p class="placeholder">No roads loaded.</p>'; }
    else {
      roadContainer.innerHTML = _roads.map((r) => {
        const blocked = r.is_blocked ? ' [currently blocked]' : '';
        return `<label class="check-item">
          <input type="checkbox" class="simRoadCheck" value="${r.id}" ${r.is_blocked ? 'checked' : ''} />
          Road ${r.id} (${r.from_location_id}→${r.to_location_id})${blocked}
        </label>`;
      }).join('');
    }
  }

  const areaContainer = document.getElementById('simAreaChecks');
  if (areaContainer) {
    if (_areas.length === 0) { areaContainer.innerHTML = '<p class="placeholder">No areas loaded.</p>'; }
    else {
      areaContainer.innerHTML = _areas.map((a) =>
        `<label class="check-item">
          <input type="checkbox" class="simAreaCheck" value="${a.id}" />
          ${a.name}
        </label>`
      ).join('');
    }
  }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

async function loadDashboard() {
  await loadAll();
  renderCentersTable();
  renderAreasTable();
  renderRoadsTable();
}

function renderCentersTable() {
  const el = document.getElementById('centersTable');
  if (!el) return;
  if (_centers.length === 0) { el.innerHTML = '<p class="placeholder">No relief centers.</p>'; return; }
  el.innerHTML = `<table>
    <thead><tr>
      <th>ID</th><th>Name</th><th>Food Kits</th><th>Water Units</th><th>Medical Kits</th>
    </tr></thead>
    <tbody>
      ${_centers.map((c) => `<tr>
        <td>${c.id}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.total_food_kits}</td>
        <td>${c.total_water_units}</td>
        <td>${c.total_medical_kits}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function renderAreasTable() {
  const el = document.getElementById('areasTable');
  if (!el) return;
  if (_areas.length === 0) { el.innerHTML = '<p class="placeholder">No affected areas.</p>'; return; }
  el.innerHTML = `<table>
    <thead><tr>
      <th>ID</th><th>Name</th><th>People</th><th>Severity</th><th>Access</th><th>Priority</th>
    </tr></thead>
    <tbody>
      ${_areas.map((a) => `<tr>
        <td>${a.id}</td>
        <td><strong>${a.name}</strong></td>
        <td>${a.people_count}</td>
        <td>${a.severity}/5</td>
        <td>${a.access_difficulty === 1 ? '⚠️ Hard' : '✅ Easy'}</td>
        <td>${priorityBadge(a.priority_score)} ${a.priority_score.toFixed(3)}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function renderRoadsTable() {
  const el = document.getElementById('roadsTable');
  if (!el) return;
  if (_roads.length === 0) { el.innerHTML = '<p class="placeholder">No roads.</p>'; return; }
  el.innerHTML = `<table>
    <thead><tr>
      <th>ID</th><th>From</th><th>To</th><th>Distance</th><th>Time (min)</th><th>Status</th>
    </tr></thead>
    <tbody>
      ${_roads.map((r) => `<tr>
        <td>${r.id}</td>
        <td>${nodeLabel(r.from_location_id, _centers, _areas)}<br><small style="color:var(--text-muted)">#${r.from_location_id}</small></td>
        <td>${nodeLabel(r.to_location_id, _centers, _areas)}<br><small style="color:var(--text-muted)">#${r.to_location_id}</small></td>
        <td>${r.distance_km} km</td>
        <td>${r.travel_time_minutes}</td>
        <td>${r.is_blocked ? '<span class="badge badge-blocked">Blocked</span>' : '<span class="badge badge-open">Open</span>'}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

// ─── Priority Scoring ─────────────────────────────────────────────────────────

async function computePriorities() {
  const el = document.getElementById('priorityResults');
  el.innerHTML = '<p class="placeholder">Computing…</p>';
  try {
    const data = await apiFetch('/compute-priorities', { method: 'POST' });
    const list = data.priorities || [];
    if (list.length === 0) { el.innerHTML = '<p class="placeholder">No areas to score.</p>'; return; }

    // Refresh cache
    _areas = await apiFetch('/areas');
    populateAreaSelects();
    renderAreasTable();

    el.innerHTML = `<table>
      <thead><tr>
        <th>Rank</th><th>Area</th><th>People</th><th>Severity</th><th>Access</th><th>Score</th><th>Priority</th>
      </tr></thead>
      <tbody>
        ${list.map((a, i) => `<tr>
          <td><strong>#${i + 1}</strong></td>
          <td><strong>${a.name}</strong></td>
          <td>${a.people_count}</td>
          <td>${a.severity}/5</td>
          <td>${a.access_difficulty === 1 ? '⚠️ Hard' : '✅ Easy'}</td>
          <td><strong style="color:var(--accent-cyan)">${a.priority_score.toFixed(4)}</strong></td>
          <td>${priorityBadge(a.priority_score)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  } catch (err) {
    el.innerHTML = `<p style="color:var(--accent-red)">Error: ${err.message}</p>`;
  }
}

// ─── Resource Allocation ──────────────────────────────────────────────────────

async function computeAllocation() {
  const summaryEl = document.getElementById('allocationSummary');
  const resultsEl = document.getElementById('allocationResults');
  resultsEl.innerHTML = '<p class="placeholder">Computing…</p>';
  summaryEl.classList.add('hidden');

  try {
    const data = await apiFetch('/allocate-resources', { method: 'POST' });

    // Summary
    const r = data.allocation_ratios;
    summaryEl.innerHTML = `
      <div><div class="stat-label">Food Ratio</div><div class="stat-value">${r.food_kits}%</div></div>
      <div><div class="stat-label">Water Ratio</div><div class="stat-value">${r.water_units}%</div></div>
      <div><div class="stat-label">Medical Ratio</div><div class="stat-value">${r.medical_kits}%</div></div>
      <div><div class="stat-label">Total Food Avail.</div><div class="stat-value">${data.available_resources.food_kits}</div></div>
      <div><div class="stat-label">Total Water Avail.</div><div class="stat-value">${data.available_resources.water_units}</div></div>
      <div><div class="stat-label">Total Medical Avail.</div><div class="stat-value">${data.available_resources.medical_kits}</div></div>
    `;
    summaryEl.classList.remove('hidden');

    // Table
    const allocs = data.allocations || [];
    if (allocs.length === 0) { resultsEl.innerHTML = '<p class="placeholder">No allocations.</p>'; return; }

    resultsEl.innerHTML = `<table>
      <thead><tr>
        <th>Area</th><th>Priority</th>
        <th>Food (req/alloc)</th><th>Fulfillment</th>
        <th>Water (req/alloc)</th><th>Fulfillment</th>
        <th>Medical (req/alloc)</th><th>Fulfillment</th>
      </tr></thead>
      <tbody>
        ${allocs.map((a) => `<tr>
          <td><strong>${a.area_name}</strong></td>
          <td>${priorityBadge(a.priority_score)}</td>
          <td>${a.required.food_kits} / ${a.allocated.food_kits}</td>
          <td>${fillBar(a.fulfillment_pct.food_kits)}</td>
          <td>${a.required.water_units} / ${a.allocated.water_units}</td>
          <td>${fillBar(a.fulfillment_pct.water_units)}</td>
          <td>${a.required.medical_kits} / ${a.allocated.medical_kits}</td>
          <td>${fillBar(a.fulfillment_pct.medical_kits)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  } catch (err) {
    resultsEl.innerHTML = `<p style="color:var(--accent-red)">Error: ${err.message}</p>`;
  }
}

// ─── Single Route ─────────────────────────────────────────────────────────────

async function findRoute() {
  const centerId = document.getElementById('routeCenter').value;
  const areaId   = document.getElementById('routeArea').value;
  const useTime  = document.getElementById('routeUseTime').checked;
  const el       = document.getElementById('routeResult');

  if (!centerId || !areaId) {
    el.innerHTML = '<p style="color:var(--accent-orange)">Please select both a center and an area.</p>';
    el.className = 'result-box warning';
    el.classList.remove('hidden');
    return;
  }

  el.innerHTML = '<p class="placeholder">Finding route…</p>';
  el.className = 'result-box';
  el.classList.remove('hidden');

  try {
    const data = await apiFetch(`/routes?centerId=${centerId}&areaId=${areaId}&useTime=${useTime}`);
    if (!data.found) {
      el.className = 'result-box warning';
      el.innerHTML = `<p style="color:var(--accent-orange)">⚠️ No route found — road may be blocked or disconnected.</p>`;
      return;
    }
    const center = _centers.find((c) => c.id === Number(centerId));
    const area   = _areas.find((a) => a.id === Number(areaId));
    el.className = 'result-box success';
    el.innerHTML = `
      <p><strong>Route:</strong> ${center?.name} → ${area?.name}</p>
      <p style="margin:.5rem 0"><strong>Total ${data.metric}:</strong>
        <span style="font-size:1.2rem;color:var(--accent-green);font-weight:700"> ${data.totalWeight} ${data.metric}</span>
      </p>
      <div class="route-path">${renderRouteNodes(data.path, _centers, _areas)}</div>
    `;
  } catch (err) {
    el.className = 'result-box error';
    el.innerHTML = `<p style="color:var(--accent-red)">Error: ${err.message}</p>`;
  }
}

// ─── Multi-Stop Route ─────────────────────────────────────────────────────────

async function planMultiStop() {
  const centerId = document.getElementById('multiCenter').value;
  const useTime  = document.getElementById('multiUseTime').checked;
  const el       = document.getElementById('multiResult');

  const selectedAreaIds = [...document.querySelectorAll('.multiAreaCheck:checked')]
    .map((cb) => Number(cb.value));

  if (!centerId) {
    el.innerHTML = '<p style="color:var(--accent-orange)">Please select a center.</p>';
    el.className = 'result-box warning';
    el.classList.remove('hidden');
    return;
  }
  if (selectedAreaIds.length === 0) {
    el.innerHTML = '<p style="color:var(--accent-orange)">Please select at least one area.</p>';
    el.className = 'result-box warning';
    el.classList.remove('hidden');
    return;
  }

  el.innerHTML = '<p class="placeholder">Planning route…</p>';
  el.className = 'result-box';
  el.classList.remove('hidden');

  try {
    const data = await apiFetch('/routes/multi-stop', {
      method: 'POST',
      body: JSON.stringify({ centerId: Number(centerId), areaIds: selectedAreaIds, useTime })
    });

    const center = _centers.find((c) => c.id === Number(centerId));
    el.className = 'result-box success';

    const segmentRows = (data.segments || []).map((seg) => {
      const from = nodeLabel(seg.from, _centers, _areas);
      const to   = nodeLabel(seg.to, _centers, _areas);
      if (!seg.reachable) {
        return `<tr><td>${from}</td><td>${to}</td><td colspan="2" style="color:var(--accent-red)">Unreachable (blocked)</td></tr>`;
      }
      return `<tr>
        <td>${from}</td><td>${to}</td>
        <td>${seg.weight} ${data.metric}</td>
        <td><div class="route-path" style="padding:.4rem">${renderRouteNodes(seg.path, _centers, _areas)}</div></td>
      </tr>`;
    }).join('');

    el.innerHTML = `
      <p><strong>Starting from:</strong> ${center?.name}</p>
      <p style="margin:.5rem 0"><strong>Total ${data.metric}:</strong>
        <span style="font-size:1.2rem;color:var(--accent-green);font-weight:700"> ${data.totalWeight} ${data.metric}</span>
      </p>
      <table style="margin-top:.75rem">
        <thead><tr><th>From</th><th>To</th><th>Distance/Time</th><th>Path</th></tr></thead>
        <tbody>${segmentRows}</tbody>
      </table>
    `;
  } catch (err) {
    el.className = 'result-box error';
    el.innerHTML = `<p style="color:var(--accent-red)">Error: ${err.message}</p>`;
  }
}

// ─── What-If Simulation ───────────────────────────────────────────────────────

async function runSimulation() {
  const centerId = document.getElementById('simCenter').value;
  const useTime  = document.getElementById('simUseTime').checked;
  const el       = document.getElementById('simResult');

  const blockedRoadIds = [...document.querySelectorAll('.simRoadCheck:checked')]
    .map((cb) => Number(cb.value));
  const areaIds = [...document.querySelectorAll('.simAreaCheck:checked')]
    .map((cb) => Number(cb.value));

  el.innerHTML = '<p class="placeholder">Running simulation…</p>';
  el.className = 'result-box';
  el.classList.remove('hidden');

  try {
    const data = await apiFetch('/simulate', {
      method: 'POST',
      body: JSON.stringify({
        blockedRoadIds,
        centerId: centerId ? Number(centerId) : null,
        areaIds,
        useTime
      })
    });

    const priorityRows = (data.priorities || []).map((a, i) =>
      `<tr>
        <td>#${i + 1}</td>
        <td><strong>${a.name}</strong></td>
        <td>${a.severity}/5</td>
        <td>${a.people_count}</td>
        <td>${a.access_difficulty === 1 ? '⚠️ Hard' : '✅ Easy'}</td>
        <td><strong style="color:var(--accent-cyan)">${a.priority_score.toFixed(4)}</strong></td>
        <td>${priorityBadge(a.priority_score)}</td>
      </tr>`
    ).join('');

    const routeRows = (data.routes || []).map((r) => {
      const area = _areas.find((a) => a.id === r.areaId);
      if (!r.found) {
        return `<tr><td>${area?.name || r.areaId}</td><td colspan="2" style="color:var(--accent-red)">🚫 No route (blocked)</td></tr>`;
      }
      return `<tr>
        <td>${area?.name || r.areaId}</td>
        <td>${r.totalWeight} ${data.metric}</td>
        <td><div class="route-path" style="padding:.4rem">${renderRouteNodes(r.path, _centers, _areas)}</div></td>
      </tr>`;
    }).join('');

    el.className = 'result-box';
    el.innerHTML = `
      <h4 style="color:var(--accent-orange);margin-bottom:.75rem">🧪 Simulation Results — ${blockedRoadIds.length} road(s) blocked</h4>

      <h5 style="margin-bottom:.4rem">Priority Ranking under Simulation</h5>
      <table>
        <thead><tr><th>Rank</th><th>Area</th><th>Severity</th><th>People</th><th>Access</th><th>Score</th><th>Priority</th></tr></thead>
        <tbody>${priorityRows}</tbody>
      </table>

      ${routeRows ? `
      <h5 style="margin:.75rem 0 .4rem">Routes from Selected Center</h5>
      <table>
        <thead><tr><th>Area</th><th>Cost (${data.metric})</th><th>Path</th></tr></thead>
        <tbody>${routeRows}</tbody>
      </table>` : ''}
    `;
  } catch (err) {
    el.className = 'result-box error';
    el.innerHTML = `<p style="color:var(--accent-red)">Error: ${err.message}</p>`;
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

async function addCenter(event) {
  event.preventDefault();
  const form = event.target;
  const body = {
    name: form.name.value,
    latitude: Number(form.latitude.value),
    longitude: Number(form.longitude.value),
    total_food_kits: Number(form.total_food_kits.value),
    total_water_units: Number(form.total_water_units.value),
    total_medical_kits: Number(form.total_medical_kits.value)
  };
  try {
    await apiFetch('/centers', { method: 'POST', body: JSON.stringify(body) });
    showMsg('addCenterMsg', 'Center added successfully!', 'success');
    form.reset();
    _centers = await apiFetch('/centers');
    populateCenterSelects();
    renderCentersTable();
  } catch (err) {
    showMsg('addCenterMsg', `Error: ${err.message}`, 'error');
  }
}

async function addArea(event) {
  event.preventDefault();
  const form = event.target;
  const body = {
    name: form.name.value,
    latitude: Number(form.latitude.value),
    longitude: Number(form.longitude.value),
    people_count: Number(form.people_count.value),
    severity: Number(form.severity.value),
    access_difficulty: Number(form.access_difficulty.value),
    required_food_kits: Number(form.required_food_kits.value),
    required_water_units: Number(form.required_water_units.value),
    required_medical_kits: Number(form.required_medical_kits.value)
  };
  try {
    await apiFetch('/areas', { method: 'POST', body: JSON.stringify(body) });
    showMsg('addAreaMsg', 'Area added successfully!', 'success');
    form.reset();
    _areas = await apiFetch('/areas');
    populateAreaSelects();
    renderAreasTable();
    renderMultiAreaChecks();
    renderSimChecks();
  } catch (err) {
    showMsg('addAreaMsg', `Error: ${err.message}`, 'error');
  }
}

async function addRoad(event) {
  event.preventDefault();
  const form = event.target;
  const body = {
    from_location_id: Number(form.from_location_id.value),
    to_location_id: Number(form.to_location_id.value),
    distance_km: Number(form.distance_km.value),
    travel_time_minutes: Number(form.travel_time_minutes.value),
    is_blocked: form.is_blocked.checked
  };
  try {
    await apiFetch('/roads', { method: 'POST', body: JSON.stringify(body) });
    showMsg('addRoadMsg', 'Road added successfully!', 'success');
    form.reset();
    _roads = await apiFetch('/roads');
    populateRoadSelects();
    renderRoadsTable();
    renderSimChecks();
  } catch (err) {
    showMsg('addRoadMsg', `Error: ${err.message}`, 'error');
  }
}

async function toggleRoadBlock() {
  const sel = document.getElementById('deleteRoadSelect');
  const roadId = sel.value;
  if (!roadId) { showMsg('deleteRoadMsg', 'Please select a road.', 'error'); return; }
  const road = _roads.find((r) => r.id === Number(roadId));
  if (!road) return;
  try {
    await apiFetch(`/roads/${roadId}`, {
      method: 'PUT',
      body: JSON.stringify({ is_blocked: !road.is_blocked })
    });
    showMsg('deleteRoadMsg', `Road ${roadId} is now ${!road.is_blocked ? 'blocked' : 'unblocked'}.`, 'success');
    _roads = await apiFetch('/roads');
    populateRoadSelects();
    renderRoadsTable();
    renderSimChecks();
  } catch (err) {
    showMsg('deleteRoadMsg', `Error: ${err.message}`, 'error');
  }
}

async function deleteRoad() {
  const sel = document.getElementById('deleteRoadSelect');
  const roadId = sel.value;
  if (!roadId) { showMsg('deleteRoadMsg', 'Please select a road.', 'error'); return; }
  if (!confirm(`Delete road ${roadId}?`)) return;
  try {
    await apiFetch(`/roads/${roadId}`, { method: 'DELETE' });
    showMsg('deleteRoadMsg', `Road ${roadId} deleted.`, 'success');
    _roads = await apiFetch('/roads');
    populateRoadSelects();
    renderRoadsTable();
    renderSimChecks();
  } catch (err) {
    showMsg('deleteRoadMsg', `Error: ${err.message}`, 'error');
  }
}

async function deleteCenter() {
  const sel = document.getElementById('deleteCenterSelect');
  const centerId = sel.value;
  if (!centerId) { showMsg('deleteCenterMsg', 'Please select a center.', 'error'); return; }
  if (!confirm(`Delete center ${centerId}?`)) return;
  try {
    await apiFetch(`/centers/${centerId}`, { method: 'DELETE' });
    showMsg('deleteCenterMsg', `Center ${centerId} deleted.`, 'success');
    _centers = await apiFetch('/centers');
    populateCenterSelects();
    renderCentersTable();
  } catch (err) {
    showMsg('deleteCenterMsg', `Error: ${err.message}`, 'error');
  }
}

async function deleteArea() {
  const sel = document.getElementById('deleteAreaSelect');
  const areaId = sel.value;
  if (!areaId) { showMsg('deleteAreaMsg', 'Please select an area.', 'error'); return; }
  if (!confirm(`Delete area ${areaId}?`)) return;
  try {
    await apiFetch(`/areas/${areaId}`, { method: 'DELETE' });
    showMsg('deleteAreaMsg', `Area ${areaId} deleted.`, 'success');
    _areas = await apiFetch('/areas');
    populateAreaSelects();
    renderAreasTable();
    renderMultiAreaChecks();
    renderSimChecks();
  } catch (err) {
    showMsg('deleteAreaMsg', `Error: ${err.message}`, 'error');
  }
}

// ─── Navigation ───────────────────────────────────────────────────────────────

document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.section).classList.add('active');
  });
});

// ─── Init ─────────────────────────────────────────────────────────────────────

loadDashboard();
