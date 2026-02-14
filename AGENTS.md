# byte-flow - AGENTS.md

## Project Overview

**byte-flow** is an enterprise backend infrastructure simulator built with Vue 3 and Vue Flow. It provides a visual, interactive canvas where users can design service architectures by dragging and connecting nodes (HTTP requests, services, databases), then simulate traffic flow to observe performance metrics.

The project name "byte-flow" reflects its purpose: visualizing the flow of bytes (data/requests) through an enterprise backend system.

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Vue 3 (Composition API) |
| Language | TypeScript (mixed with JavaScript) |
| Build Tool | Vite 7.x |
| UI Library | Vue Flow (@vue-flow/core 1.48+) |
| Node-based Diagram | @vue-flow/background, @vue-flow/controls, @vue-flow/node-toolbar |
| License | MIT |

## Project Structure

```
byte-flow/
├── index.html              # Entry HTML file
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript project references
├── tsconfig.app.json       # App TypeScript config (extends @vue/tsconfig)
├── tsconfig.node.json      # Node/Vite TypeScript config
├── public/                 # Static assets
│   └── vite.svg
├── src/
│   ├── main.ts             # App entry point, Vue instance creation
│   ├── App.vue             # Root component with VueFlow canvas
│   ├── style.css           # Global styles, Vue Flow theme imports
│   ├── Sidebar.vue         # Left panel with draggable node templates
│   ├── ToolbarNode.vue     # Toolbar node component (unused sample)
│   ├── DropzoneBackground.vue  # Canvas background component
│   ├── useDnd.js           # Drag and drop composable
│   ├── components/         # Generic components
│   │   └── HelloWorld.vue  # Sample component (unused)
│   ├── nodes/              # Custom node type components
│   │   ├── HttpRequestNode.vue   # HTTP request entry node
│   │   ├── ServiceNode.vue       # Backend service node
│   │   └── DatabaseNode.vue      # Database node
│   ├── edges/              # Custom edge type components
│   │   ├── AnimationEdge.vue     # Animated process edge (unused)
│   │   ├── TrafficEdge.vue       # Traffic visualization edge
│   │   └── useRunProcess.js      # Process running composable
│   └── simulator/
│       └── engine.js       # Core simulation engine
```

## Node Types

The application supports three main node types:

### 1. HTTP Request Node (`http`)
- **Purpose**: Entry point for simulated requests
- **Visual**: Purple gradient card with method badge (GET/POST/PUT) and path
- **Data Props**: `method`, `path`, `modules`, `processingDelay`
- **Behavior**: Generates requests during simulation based on configured modules

### 2. Service Node (`service`)
- **Purpose**: Backend service that processes requests
- **Visual**: Dark card with service type indicator (microservice/small/monolith)
- **Subtypes**:
  - Microservice (1 module, blue)
  - Small Service (2-3 modules, yellow)
  - Monolith (5+ modules, purple)
- **Data Props**: `name`, `modules[]`, `moduleCapacity`, `load`, `messageQueue`
- **Interaction**: Double-click to toggle between monolith/microservice modes

### 3. Database Node (`database`)
- **Purpose**: Data storage endpoint
- **Visual**: 3D cylinder shape with module sharding visualization
- **Types**: PostgreSQL, MongoDB, Redis
- **Data Props**: `type`, `name`, `modules[]`, `moduleQps`, `shards`

## Build and Development Commands

```bash
# Install dependencies
npm install

# Start development server (Vite dev server)
npm run dev

# Build for production (type check + vite build)
npm run build

# Preview production build locally
npm run preview
```

## Key Features

### Edit Mode (编辑模式)
- Drag nodes from sidebar to canvas
- Connect nodes by dragging between handles
- Configure network latency per edge (10-500ms)
- Configure processing delay per node
- Double-click service nodes to toggle architecture patterns

### Simulation Mode (模拟模式)
- Real-time request generation from HTTP nodes
- Visual traffic flow animation on edges
- Live metrics display:
  - Total requests processed
  - Average latency
  - Throughput (RPS)
  - Per-node load/saturation
- Adjustable simulation speed (0.5x - 5x)
- Overload warnings when saturation > 90%

## Architecture Patterns

The simulator allows comparing different architecture patterns:

1. **Monolithic**: Single node with all modules (user, order, payment, inventory, notification)
2. **Microservices**: Separate nodes per module with message queue communication
3. **Hybrid**: Small services with 2-3 modules each

## Simulation Engine

Located in `src/simulator/engine.js`, the simulation engine:

- Generates requests from HTTP nodes every simulation tick
- Propagates requests through connected nodes
- Calculates processing delays based on:
  - Node type and capacity
  - Module matching efficiency
  - Current load factor
  - Network latency on edges
- Updates real-time metrics and node states

## Code Conventions

### Language
- Comments and UI text are primarily in **Chinese (Simplified)**
- Variable names use camelCase in English
- Component names use PascalCase

### Vue 3 Patterns
- Uses `<script setup>` syntax throughout
- Composition API with `ref`, `computed`, `watch`
- Props defined with `defineProps()`
- Emits defined with `defineEmits()` (where used)

### File Extensions
- `.vue` for Vue SFC components
- `.ts` for TypeScript files (main.ts, configs)
- `.js` for JavaScript logic files (composables, engine)

## State Management

- **Vue Flow State**: Managed by `@vue-flow/core` composables (`useVueFlow`)
- **Simulation State**: Provided via Vue's `provide/inject` API
  - Injection key: `'simulation'`
  - Contains: `isSimulating`, `simulationSpeed`, `metrics`, `startSimulation`, `stopSimulation`

## Styling Guidelines

- **CSS**: Scoped styles in single-file components
- **Global Styles**: `src/style.css` imports Vue Flow themes
- **Color Scheme**: Dark theme (#1a202c, #2d3748 backgrounds)
- **Status Colors**:
  - Green (#48bb78): Healthy, low load, success
  - Yellow (#ecc94b): Warning, medium load
  - Red (#f56565): Critical, overload, error
- **Animations**: CSS keyframes for pulse, glow, flow effects

## Testing

- **No test framework configured** - This project currently has no automated tests
- Manual testing is done through the development server

## Security Considerations

- This is a client-side simulation tool with no backend API
- No authentication or authorization mechanisms
- No sensitive data handling
- Input validation is minimal (simulation parameters only)

## Known Limitations

1. No persistence - architectures cannot be saved/loaded
2. No test suite
3. Limited to three node types (HTTP, Service, Database)
4. Load balancer node type is defined but commented out
5. AnimationEdge and useRunProcess are unused legacy code

## Development Roadmap (from README)

### Completed
- [x] Import Vue Flow
- [x] Init "Node Template Zone" with LB, Server and DB prototypes

### Pending
- [ ] Design attribute for input request
- [ ] Init "Working Sheet Tabs" with default cases
- [ ] Default zoom in & zoom out buttons
