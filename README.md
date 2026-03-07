# Disaster Relief Resource Routing Platform

A full-stack web application for managing disaster relief operations — priority scoring, resource allocation, and route optimisation for NGOs and emergency authorities.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | HTML5, CSS3 (dark theme), Vanilla JS |
| Backend   | Node.js, Express.js                 |
| Database  | MongoDB (Mongoose ODM)              |
| Algorithms| Dijkstra's shortest path, TSP nearest-neighbour heuristic |

---

## Project Structure

```
backend/
├── server.js           # Express server — all API endpoints
├── database.js         # Mongoose models + seed data
├── priorityScorer.js   # Priority scoring & resource allocation
├── routingEngine.js    # Dijkstra + multi-stop routing
├── package.json
└── .env.example

frontend/
├── index.html          # Main UI (7 sections)
├── styles.css          # Emergency command centre dark theme
└── app.js              # Fetch API integration + dynamic DOM

README.md
```

---

## Setup

### Prerequisites
- Node.js >= 18
- MongoDB running locally (default: mongodb://localhost:27017)

### Backend

```bash
cd backend
npm install
cp .env.example .env          # edit MONGO_URI / PORT as needed
npm start                     # -> http://localhost:3000
```

The server auto-seeds sample data (2 relief centers, 3 affected areas, 7 roads) on first run.

### Frontend

Open `frontend/index.html` directly in a browser, **or** serve it with any HTTP server:

```bash
npx serve frontend
```

> Make sure the backend is running on port 3000 before opening the frontend.

---

## API Reference

### Root
| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/`  | API info & available endpoints |

### Relief Centers
| Method   | Path           | Description       |
|----------|----------------|-------------------|
| `GET`    | `/centers`     | List all centers  |
| `GET`    | `/centers/:id` | Get one center    |
| `POST`   | `/centers`     | Add a center      |
| `PUT`    | `/centers/:id` | Update a center   |
| `DELETE` | `/centers/:id` | Delete a center   |

### Affected Areas
| Method   | Path        | Description     |
|----------|-------------|-----------------|
| `GET`    | `/areas`    | List all areas  |
| `GET`    | `/areas/:id`| Get one area    |
| `POST`   | `/areas`    | Add an area     |
| `PUT`    | `/areas/:id`| Update an area  |
| `DELETE` | `/areas/:id`| Delete an area  |

### Roads
| Method   | Path        | Description              |
|----------|-------------|--------------------------|
| `GET`    | `/roads`    | List all roads           |
| `POST`   | `/roads`    | Add a road               |
| `PUT`    | `/roads/:id`| Update (block/unblock)   |
| `DELETE` | `/roads/:id`| Delete a road            |

### Planning & Analytics
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/compute-priorities` | Score & rank all areas |
| `POST` | `/allocate-resources` | Proportional resource distribution |
| `GET`  | `/routes?centerId=X&areaId=Y&useTime=true` | Dijkstra shortest path |
| `POST` | `/routes/multi-stop` | Nearest-neighbour multi-stop planner |
| `POST` | `/simulate` | What-if scenario (block roads, see impact) |

---

## Algorithm Details

### Priority Scoring
```
P = 0.5 * (severity / 5)
  + 0.3 * (people_count / max_people)
  + 0.2 * access_difficulty
```

### Resource Allocation
```
Allocation Ratio = Available Resources / Total Required   (capped at 1.0)
Allocated Amount = Required Amount * Allocation Ratio
```

### Routing: Dijkstra's Algorithm
- Relief centres: node ID = center.id
- Affected areas: node ID = area.id + 1000
- Blocked roads are excluded from the graph

### Multi-Stop Routing (TSP - Nearest Neighbour)
1. Start at the selected relief centre
2. Find the closest unvisited area using Dijkstra
3. Move there and mark as visited
4. Repeat until all areas are visited

---

## Seed Data

| Type   | Name                     | Details                                       |
|--------|--------------------------|-----------------------------------------------|
| Center | Central Relief Hub       | 500 food, 1000 water, 200 medical kits        |
| Center | North District Warehouse | 300 food, 500 water, 100 medical kits         |
| Area   | Flood Zone A             | 250 people, severity 5, hard access           |
| Area   | Village Beta             | 150 people, severity 3, easy access           |
| Area   | Landslide Area C         | 400 people, severity 4, hard access           |
| Roads  | 7 connections            | Varying distances; one road blocked by default|

---

## Frontend Sections

1. **Dashboard** - live tables of centers, areas, and roads
2. **Priority Scoring** - compute & rank areas with colour-coded badges
3. **Resource Allocation** - fulfillment percentages with visual progress bars
4. **Route Finder** - point-to-point Dijkstra (distance or time)
5. **Multi-Stop Planner** - nearest-neighbour TSP across selected areas
6. **What-If Simulation** - block roads and see how priorities & routes change
7. **Manage Data** - add / delete centers, areas, and roads

---

## License

MIT
