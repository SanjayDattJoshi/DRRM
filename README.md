# 🚨 Disaster Relief Command Center

**Full-Stack Web Application: Express.js + In-Memory DB (MongoDB-ready) + Vanilla JavaScript + Leaflet.js**

A data-driven disaster relief resource allocation and route optimization system that helps NGOs and authorities prioritize affected locations, allocate limited resources efficiently, and compute optimal delivery routes during emergencies.

> **v1.1 Update:** Now includes a fully interactive **Network Overview Map** powered by Leaflet.js — showing relief centers, affected areas, and road connections (including blocked roads) live on a real map.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Installation & Setup](#-installation--setup)
- [Usage](#-usage)
- [Network Overview Map](#-network-overview-map)
- [API Documentation](#-api-documentation)
- [Algorithms](#-algorithms)
- [Troubleshooting](#-troubleshooting)
- [Future Enhancements](#-future-enhancements)

---

## ✨ Features

### Core Functionality

| Feature | Description |
|---|---|
| 🗺️ **Network Overview Map** | Interactive Leaflet.js map showing centers, areas, and roads with live status |
| 🎯 **Priority Scoring Engine** | Automatically ranks affected areas using a weighted algorithm |
| 📦 **Resource Management** | Track relief center inventories and affected area needs |
| 🛣️ **Route Optimization** | Dijkstra's algorithm for shortest-path computation |
| 🔀 **Multi-Stop Routing** | Nearest-neighbour TSP heuristic for visiting multiple areas |
| 📊 **Real-time Dashboard** | Live statistics, priority rankings, and road network status |
| 🔄 **What-If Simulation** | Temporarily block/unblock roads to test operational impact |
| 💾 **Data Persistence** | In-memory store with MongoDB-ready interface |
| 🔌 **RESTful API** | Complete backend API for all operations |

### Map Features (New in v1.1)

- ✅ **Green markers** for relief centers with inventory popup
- ✅ **Colour-coded area markers** — Red (high priority), Orange (medium), Blue (low) with animated pulse on critical zones
- ✅ **Blue polylines** for open roads with distance/time tooltip
- ✅ **Red dashed lines** for blocked roads
- ✅ **Layer toggles** — show/hide centers, areas, or roads independently
- ✅ **Fit All** button to zoom map to encompass all data points
- ✅ **Auto-refresh** — map updates whenever data changes (add/remove/simulate)
- ✅ **Dark tile theme** — OpenStreetMap tiles filtered to match the command-centre aesthetic

---

## 🛠️ Tech Stack

### Backend
| Component | Technology |
|---|---|
| Runtime | Node.js v18+ |
| Framework | Express.js 4.18+ |
| Database | In-memory JavaScript class (MongoDB-ready) |
| ODM | Mongoose 8.0+ *(optional, for MongoDB upgrade)* |
| Middleware | cors, body-parser, dotenv |
| Dev Server | nodemon 3.0+ |

### Frontend
| Component | Technology |
|---|---|
| Structure | HTML5 (Single-Page Application) |
| Styling | CSS3 with custom dark command-centre theme |
| Logic | Vanilla JavaScript ES6+ |
| Map | **Leaflet.js 1.9.4** with OpenStreetMap tiles |
| Fonts | Orbitron (headings), Rajdhani (body) via Google Fonts |
| API Calls | Fetch API with async/await |

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                         │
│         HTML + CSS + JavaScript + Leaflet.js Map             │
└────────────────┬─────────────────────────────────────────────┘
                 │ HTTP Requests (Fetch API)
                 ▼
┌──────────────────────────────────────────────────────────────┐
│                   EXPRESS.JS SERVER (port 3000)              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  REST API Routes                                     │    │
│  │  GET/POST/PUT/DELETE  /centers /areas /roads         │    │
│  │  POST  /compute-priorities  /allocate-resources      │    │
│  │  GET   /routes              POST /routes/multi-stop  │    │
│  │  POST  /simulate                                     │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │  priorityScorer.js   — weighted P-score formula      │    │
│  │  routingEngine.js    — Dijkstra + TSP nearest-nbr    │    │
│  │  database.js         — in-memory CRUD store          │    │
│  └──────────────────────────────────────────────────────┘    │
└────────────────┬─────────────────────────────────────────────┘
                 │ (swap database.js for Mongoose)
                 ▼
┌──────────────────────────────────────────────────────────────┐
│               DATABASE (In-Memory / MongoDB)                 │
│   ┌────────────┐   ┌────────────┐   ┌────────────┐          │
│   │  Centers   │   │   Areas    │   │   Roads    │          │
│   └────────────┘   └────────────┘   └────────────┘          │
└──────────────────────────────────────────────────────────────┘
```

### Node ID Convention
Centers use their raw IDs (`1`, `2`, `3`...). Areas are stored in the routing graph as **`area.id + 1000`** (e.g. area #1 → node `1001`). This prevents ID collisions when both types share the same graph — used consistently across `database.js`, `routingEngine.js`, and the frontend map.

---

## 📁 Project Structure

```
dssrCopy/
│
├── backend/
│   ├── server.js              # Express app + all 19 API routes (~280 lines)
│   ├── database.js            # In-memory CRUD store + sample data (~130 lines)
│   ├── priorityScorer.js      # Priority formula + resource allocation (~80 lines)
│   ├── routingEngine.js       # Graph + Dijkstra + multi-stop TSP (~170 lines)
│   ├── package.json           # Dependencies
│   └── .env                   # PORT and optional MONGODB_URI
│
├── frontend/
│   ├── index.html             # SPA shell — 5 tabs + Leaflet.js CDN imports
│   ├── app.js                 # All UI logic, API calls, map rendering (~400 lines)
│   └── style.css              # Dark command-centre theme + map styles (~400 lines)
│
├── ALGORITHMS.md              # Algorithm deep-dive
├── API.md                     # API endpoint reference
└── README.md                  # This file
```

---

## 📦 Installation & Setup

### Prerequisites

- **Node.js v18+** → [nodejs.org](https://nodejs.org)
- **npm** (bundled with Node.js)
- A modern browser (Chrome, Firefox, or Edge)
- Internet connection (for OpenStreetMap tiles in the map)

### Step 1 — Install Backend Dependencies

```bash
cd dssrCopy/backend
npm install
```

### Step 2 — Configure Environment (Optional)

Create a `.env` file inside `backend/`:

```env
PORT=3000
# Optional — only needed if upgrading to real MongoDB
MONGODB_URI=mongodb://localhost:27017/disaster-relief
```

The server defaults to port **3000** if no `.env` is present.

### Step 3 — Start the Backend Server

```bash
# Standard start
node server.js

# Auto-restart on file changes (recommended during development)
npm run dev
```

Expected output:
```
🚨 Disaster Relief API running on port 3000
📍 Access API at: http://localhost:3000
📊 Health check: http://localhost:3000/
```

### Step 4 — Open the Frontend

```bash
# Option A: Open the file directly in your browser
open dssrCopy/frontend/index.html

# Option B: Serve with a local HTTP server (avoids any file:// CORS quirks)
cd dssrCopy/frontend
npx serve .
```

> ⚠️ **Always start the backend BEFORE opening the frontend.** The page loads all data on startup. If the backend is not running, the map will show zeros. Click **Refresh Map** after starting the backend to reload.

---

## 🚀 Usage

### Basic Workflow

**1. Dashboard & Map**
- Open the app — the Network Overview Map loads automatically
- Green dots = relief centers, coloured dots = affected areas, lines = roads
- One dashed red line is visible by default (Road #7 is blocked in sample data)

**2. Compute Priorities**
- Click the **Priority Scoring** tab
- Click **"Calculate All Priorities"**
- Areas are ranked by urgency score; map markers update colour instantly:
  - 🔴 Red = High priority (score ≥ 0.7) — animated pulse ring
  - 🟠 Orange = Medium priority (score ≥ 0.4)
  - 🔵 Blue = Low priority (score < 0.4)

**3. Plan a Route**
- Click the **Route Planning** tab
- Select a relief center and an affected area
- Optionally check "Optimize by Time" instead of distance
- Click **"Find Shortest Route"** — the path is shown as a visual node chain

**4. Multi-Stop Route**
- On the same tab, use the right panel to select multiple areas
- Click **"Plan Multi-Stop Route"** — uses nearest-neighbour TSP heuristic

**5. Add New Data**
- Click the **Resource Management** tab
- Fill in any of the three forms (Add Center / Add Area / Add Road)
- New entries appear in the dashboard lists and on the map immediately

**6. What-If Simulation**
- Click the **What-If Analysis** tab
- Select a road and choose Block or Unblock
- Click **"Run Simulation"** — see how priorities would change without saving
- The map updates to show the simulated road status

### Sample Scenario (Built-in Data)

| Entity | Details |
|---|---|
| Central Relief Hub | Lat 27.1767, Lng 78.0081 · 1000 food, 2000 water, 500 medical |
| North District Warehouse | Lat 27.25, Lng 78.10 · 800 food, 1500 water, 400 medical |
| Flood Zone A | Severity 5, 250 people, Difficult access |
| Village Beta | Severity 3, 150 people, Easy access |
| Landslide Area C | Severity 4, 400 people, Difficult access |
| Road #7 | Village Beta ↔ Landslide Area C — **BLOCKED** by default |

---

## 🗺️ Network Overview Map

The map is the centrepiece of the Dashboard tab. Here is how it works technically.

### Initialisation
Leaflet is loaded from a CDN — no npm install required:
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"/>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
```

### Layer System
Three independent `L.layerGroup()` instances allow toggling:

| Layer | Contents | Style |
|---|---|---|
| `centerLayer` | Relief center markers | Green static circles |
| `areaLayer` | Affected area markers | Red/Orange/Blue by priority; pulse ring on high |
| `routeLayer` | Road polylines | Blue solid (open), Red dashed (blocked) |

### Correct Loading Order
Roads need coordinates to draw lines. The loading sequence is enforced with `await`:
```javascript
async function loadAllData() {
  await loadCenters();  // populates locCoords for center IDs
  await loadAreas();    // populates locCoords for area IDs (id+1000)
  await loadRoads();    // all coordinates ready — road lines draw correctly
}
```

### Tab Switch Fix
When the Dashboard tab is hidden, Leaflet cannot measure the container. On re-activation:
```javascript
if (targetTab === 'dashboard' && networkMap) {
  setTimeout(() => networkMap.invalidateSize(), 50);
}
```

---

## 📡 API Documentation

**Base URL:** `http://localhost:3000`

All endpoints return a consistent JSON envelope:
```json
{ "success": true,  "count": 3, "data": [ ... ] }
{ "success": false, "error": "Descriptive error message" }
```

### Relief Centers

| Method | Endpoint | Description |
|---|---|---|
| GET | `/centers` | Get all relief centers |
| GET | `/centers/:id` | Get a single center by ID |
| POST | `/centers` | Add a new relief center |
| PUT | `/centers/:id` | Update an existing center |
| DELETE | `/centers/:id` | Delete a center |

**POST /centers body:**
```json
{
  "name": "Dehradun Hub",
  "latitude": 30.3165,
  "longitude": 78.0322,
  "total_food_kits": 750,
  "total_water_units": 1500,
  "total_medical_kits": 250
}
```

### Affected Areas

| Method | Endpoint | Description |
|---|---|---|
| GET | `/areas` | Get all areas (includes `priority_score` if computed) |
| GET | `/areas/:id` | Get a single area by ID |
| POST | `/areas` | Add a new affected area |
| PUT | `/areas/:id` | Update an existing area |
| DELETE | `/areas/:id` | Delete an area |

**POST /areas body:**
```json
{
  "name": "Kedarnath Village",
  "latitude": 30.7346,
  "longitude": 79.0669,
  "people_count": 500,
  "severity": 5,
  "access_difficulty": 1,
  "required_food_kits": 300,
  "required_water_units": 600,
  "required_medical_kits": 100
}
```

### Roads

| Method | Endpoint | Description |
|---|---|---|
| GET | `/roads` | Get all road connections |
| POST | `/roads` | Add a new road connection |
| PUT | `/roads/:id` | Update a road (e.g. block/unblock) |
| DELETE | `/roads/:id` | Delete a road |

**POST /roads body:**
```json
{
  "from_location_id": 1,
  "to_location_id": 1001,
  "distance_km": 15.5,
  "travel_time_minutes": 45,
  "is_blocked": false
}
```

### Analytics & Routing

| Method | Endpoint | Description |
|---|---|---|
| POST | `/compute-priorities` | Calculate and store priority scores for all areas |
| POST | `/allocate-resources` | Compute proportional resource allocation |
| GET | `/routes?centerId=1&areaId=2&useTime=false` | Find shortest single route |
| POST | `/routes/multi-stop` | Find multi-stop route |
| POST | `/simulate` | Run what-if simulation (non-destructive) |

**GET /routes query params:**

| Param | Type | Description |
|---|---|---|
| `centerId` | Integer | Relief center ID |
| `areaId` | Integer | Affected area ID (raw, not graph ID) |
| `useTime` | Boolean | `true` = optimise by time, `false` = by distance |

**POST /routes/multi-stop body:**
```json
{
  "centerId": 1,
  "areaIds": [1, 2, 3],
  "useTime": false
}
```

**POST /simulate body:**
```json
{
  "roadId": 7,
  "blocked": true
}
```

### Quick Test (curl)

```bash
# Health check
curl http://localhost:3000/

# Get all centers
curl http://localhost:3000/centers

# Compute priorities
curl -X POST http://localhost:3000/compute-priorities

# Find route (center 1 to area 2, by distance)
curl "http://localhost:3000/routes?centerId=1&areaId=2&useTime=false"

# Block road #7
curl -X PUT http://localhost:3000/roads/7 \
     -H "Content-Type: application/json" \
     -d '{"is_blocked": true}'
```

---

## 🧮 Algorithms

### 1. Priority Scoring

**Formula:**
```
P = 0.5 × (severity / 5)  +  0.3 × (people / max_people)  +  0.2 × access_difficulty
```

| Component | Weight | Rationale |
|---|---|---|
| Severity | 50% | Directly reflects immediate danger to life |
| Population (normalised) | 30% | More people = greater total need |
| Access Difficulty | 20% | Hard-to-reach areas may need priority scheduling |

**Example — Flood Zone A:**
```
severity     = 5   → S_norm = 5/5   = 1.0
people       = 250 → N_norm = 250/400 = 0.625   (max is Landslide Area C with 400)
access       = 1   (difficult)

P = 0.5(1.0) + 0.3(0.625) + 0.2(1)
  = 0.5 + 0.1875 + 0.2
  = 0.8875  → HIGH PRIORITY (red marker, pulse animation)
```

**Time complexity:** O(n log n) — one pass to find max, then sort

---

### 2. Dijkstra's Shortest Path

**Purpose:** Find optimal route from a relief center to an affected area.

**Steps:**
1. Initialise all node distances to ∞; source node distance = 0
2. Add all nodes to an unvisited set
3. Pick the unvisited node with the smallest known distance
4. For each neighbour, compute tentative distance (current + edge weight)
5. If tentative < stored, update it and record the predecessor
6. Mark current node as visited; stop if it is the destination
7. Reconstruct path by backtracking through the predecessor map

**Key details:**
- Nodes = all relief centers + all affected areas
- Edges = road connections (blocked roads are excluded entirely from the graph)
- Edge weight = `distance_km` or `travel_time_minutes` depending on `useTime` flag
- **Time complexity:** O(V²) with Set — sufficient for small networks; upgradeable to O((V+E) log V) with a binary heap

---

### 3. Multi-Stop Routing (TSP Nearest-Neighbour)

Finding the exact shortest route visiting N areas is NP-hard (Travelling Salesman Problem). The nearest-neighbour heuristic gives a good approximation in polynomial time:

1. Start at the relief center
2. Run Dijkstra to every unvisited area; pick the nearest
3. Move there, mark visited
4. Repeat until all areas are visited
5. Return to the starting center

**Quality:** Typically within 20–25% of optimal. For 3–10 areas (typical disaster scenario) this is excellent performance with near-instant computation.

**Time complexity:** O(N²) where N = number of selected areas

---

### 4. Resource Allocation

Proportional distribution when supply cannot fully meet demand:

```javascript
ratio = min(totalAvailable / totalRequired, 1.0)  // per resource type
allocation = Math.floor(area.required × ratio)
```

If supply ≥ demand, ratio = 1.0 and all needs are fully met. If supply < demand, every area gets the same proportional share.

---

## 🐛 Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Map shows 0 for all counts | Frontend loaded before backend started | Start backend first; click **Refresh Map** |
| Map is blank / no tiles | No internet connection | OpenStreetMap tiles require internet access |
| CORS error in browser console | Backend not running or wrong port | Verify server is on port 3000; check `API_URL` in app.js |
| Route says "No route found" | All paths between nodes are blocked | Unblock a road or add an alternative connection |
| Priority scores are all 0 | Priorities not computed yet | Click **"Calculate All Priorities"** on Priority Scoring tab |
| Map looks wrong after tab switch | Leaflet cannot measure hidden container | Already fixed — `invalidateSize()` fires on tab activation |
| "Module not found" on start | Dependencies not installed | Run `cd backend && npm install` |
| Port 3000 already in use | Another process using the port | Change `PORT=3001` in `.env` and update `API_URL` in app.js |

---

## 🚀 Future Enhancements

- [ ] Real MongoDB / MongoDB Atlas integration (interface is already compatible)
- [ ] Real-time updates with Socket.io — push road-status changes to all dashboards instantly
- [ ] Route visualisation drawn on the map as a highlighted polyline
- [ ] Mobile responsive layout improvements
- [ ] JWT authentication with role-based access (field worker / coordinator / admin)
- [ ] Real-time satellite imagery integration (ISRO NDEM API)
- [ ] Machine learning for disaster severity prediction
- [ ] Multi-vehicle route optimisation
- [ ] SMS / WhatsApp integration for field updates
- [ ] Blockchain-based supply chain tracking
- [ ] IoT sensor integration
- [ ] Multi-language support
- [ ] A* pathfinding upgrade using GPS coordinates as heuristic
- [ ] 2-opt improvement for multi-stop route quality

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 👥 Authors

**Sanjay Datt Joshi** — Initial work and development
📧 sanjayjoshi7409882635@gmail.com

---

## 🙏 Acknowledgments

- India Disaster Resource Network (IDRN) for data references
- National Disaster Management Authority (NDMA) for operational guidelines
- OpenStreetMap contributors for map tile data
- Leaflet.js team for the excellent open-source mapping library
- MongoDB and Express.js communities for documentation

---

*Made with ❤️ for disaster relief operations*
