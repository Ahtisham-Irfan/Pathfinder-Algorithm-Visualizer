const ROWS = 16;
const COLS = 34;

const gridEl = document.getElementById('grid');
const algoSelect = document.getElementById('algoSelect');
const speedSelect = document.getElementById('speedSelect');
const visualizeBtn = document.getElementById('visualizeBtn');
const mazeBtn = document.getElementById('mazeBtn');
const clearPathBtn = document.getElementById('clearPathBtn');
const clearBtn = document.getElementById('clearBtn');
const statVisited = document.getElementById('statVisited');
const statPath = document.getElementById('statPath');
const statTime = document.getElementById('statTime');
const statResult = document.querySelector('#statResult .stat-num');

gridEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
gridEl.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;

let startPos = { row: Math.floor(ROWS / 2), col: 5 };
let endPos = { row: Math.floor(ROWS / 2), col: COLS - 6 };

let nodes = [];
let cellEls = [];
let isMouseDown = false;
let draggingNode = null; // 'start' | 'end' | null
let isAnimating = false;

function createNode(row, col) {
  return {
    row, col,
    isWall: false,
    distance: Infinity,
    g: Infinity,
    f: Infinity,
    visited: false,
    previous: null
  };
}

function buildGrid() {
  gridEl.innerHTML = '';
  nodes = [];
  cellEls = [];
  for (let r = 0; r < ROWS; r++) {
    const nodeRow = [];
    const elRow = [];
    for (let c = 0; c < COLS; c++) {
      nodeRow.push(createNode(r, c));
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('mousedown', (e) => handleMouseDown(r, c, e));
      cell.addEventListener('mouseenter', () => handleMouseEnter(r, c));
      cell.addEventListener('mouseup', () => handleMouseUp());
      cell.addEventListener('touchstart', (e) => { e.preventDefault(); handleMouseDown(r, c, e); }, { passive: false });
      gridEl.appendChild(cell);
      elRow.push(cell);
    }
    nodes.push(nodeRow);
    cellEls.push(elRow);
  }
  paintEndpoints();
}

function paintEndpoints() {
  document.querySelectorAll('.cell').forEach(c => c.classList.remove('start', 'end'));
  cellEls[startPos.row][startPos.col].classList.add('start');
  cellEls[endPos.row][endPos.col].classList.add('end');
}

function isEndpoint(row, col) {
  return (row === startPos.row && col === startPos.col) || (row === endPos.row && col === endPos.col);
}

function handleMouseDown(row, col, e) {
  if (isAnimating) return;
  if (row === startPos.row && col === startPos.col) { draggingNode = 'start'; return; }
  if (row === endPos.row && col === endPos.col) { draggingNode = 'end'; return; }
  isMouseDown = true;
  toggleWall(row, col);
}

function handleMouseEnter(row, col) {
  if (isAnimating) return;
  if (draggingNode) {
    if (nodes[row][col].isWall) return;
    if (draggingNode === 'start') startPos = { row, col };
    else endPos = { row, col };
    paintEndpoints();
    return;
  }
  if (isMouseDown) toggleWall(row, col);
}

function handleMouseUp() {
  isMouseDown = false;
  draggingNode = null;
}

window.addEventListener('mouseup', handleMouseUp);
window.addEventListener('touchend', handleMouseUp);

function toggleWall(row, col) {
  if (isEndpoint(row, col)) return;
  const node = nodes[row][col];
  node.isWall = !node.isWall;
  cellEls[row][col].classList.toggle('wall', node.isWall);
}

function resetPathVisuals() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      cellEls[r][c].classList.remove('visited', 'path');
    }
  }
}

function resetAlgoState() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const n = nodes[r][c];
      n.distance = Infinity;
      n.g = Infinity;
      n.f = Infinity;
      n.visited = false;
      n.previous = null;
    }
  }
}

function getNeighbors(node) {
  const { row, col } = node;
  const result = [];
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    const nr = row + dr, nc = col + dc;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
      const n = nodes[nr][nc];
      if (!n.isWall) result.push(n);
    }
  }
  return result;
}

function manhattan(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

/* ---------- BFS ---------- */
function bfs(start, end) {
  const visitedOrder = [];
  const queue = [start];
  start.visited = true;
  start.distance = 0;
  while (queue.length) {
    const current = queue.shift();
    visitedOrder.push(current);
    if (current === end) return { visitedOrder, found: true };
    for (const neighbor of getNeighbors(current)) {
      if (!neighbor.visited) {
        neighbor.visited = true;
        neighbor.previous = current;
        queue.push(neighbor);
      }
    }
  }
  return { visitedOrder, found: false };
}

/* ---------- DFS ---------- */
function dfs(start, end) {
  const visitedOrder = [];
  const stack = [start];
  while (stack.length) {
    const current = stack.pop();
    if (current.visited) continue;
    current.visited = true;
    visitedOrder.push(current);
    if (current === end) return { visitedOrder, found: true };
    for (const neighbor of getNeighbors(current)) {
      if (!neighbor.visited) {
        neighbor.previous = current;
        stack.push(neighbor);
      }
    }
  }
  return { visitedOrder, found: false };
}

/* ---------- Dijkstra ---------- */
function dijkstra(start, end) {
  const visitedOrder = [];
  start.distance = 0;
  const unvisited = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!nodes[r][c].isWall) unvisited.push(nodes[r][c]);

  while (unvisited.length) {
    unvisited.sort((a, b) => a.distance - b.distance);
    const current = unvisited.shift();
    if (current.distance === Infinity) break;
    current.visited = true;
    visitedOrder.push(current);
    if (current === end) return { visitedOrder, found: true };
    for (const neighbor of getNeighbors(current)) {
      if (!neighbor.visited) {
        const newDist = current.distance + 1;
        if (newDist < neighbor.distance) {
          neighbor.distance = newDist;
          neighbor.previous = current;
        }
      }
    }
  }
  return { visitedOrder, found: false };
}

/* ---------- A* ---------- */
function astar(start, end) {
  const visitedOrder = [];
  start.g = 0;
  start.f = manhattan(start, end);
  const open = [start];

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    if (current.visited) continue;
    current.visited = true;
    visitedOrder.push(current);
    if (current === end) return { visitedOrder, found: true };
    for (const neighbor of getNeighbors(current)) {
      if (neighbor.visited) continue;
      const tentativeG = current.g + 1;
      if (tentativeG < neighbor.g) {
        neighbor.g = tentativeG;
        neighbor.f = tentativeG + manhattan(neighbor, end);
        neighbor.previous = current;
        open.push(neighbor);
      }
    }
  }
  return { visitedOrder, found: false };
}

function reconstructPath(end) {
  const path = [];
  let curr = end.previous;
  while (curr && curr !== nodes[startPos.row][startPos.col]) {
    path.push(curr);
    curr = curr.previous;
  }
  return path.reverse();
}

async function animate(visitedOrder, path, speed) {
  isAnimating = true;
  setControlsDisabled(true);

  for (let i = 0; i < visitedOrder.length; i++) {
    const node = visitedOrder[i];
    if (isEndpoint(node.row, node.col)) continue;
    cellEls[node.row][node.col].classList.add('visited');
    statVisited.textContent = i + 1;
    await sleep(speed);
  }

  for (let i = 0; i < path.length; i++) {
    const node = path[i];
    cellEls[node.row][node.col].classList.add('path');
    statPath.textContent = i + 1;
    await sleep(speed * 1.6);
  }

  setControlsDisabled(false);
  isAnimating = false;
}

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

function setControlsDisabled(disabled) {
  visualizeBtn.disabled = disabled;
  mazeBtn.disabled = disabled;
  clearPathBtn.disabled = disabled;
  clearBtn.disabled = disabled;
  algoSelect.disabled = disabled;
}

async function runVisualization() {
  if (isAnimating) return;
  resetPathVisuals();
  resetAlgoState();
  statVisited.textContent = '0';
  statPath.textContent = '0';
  statResult.textContent = '—';

  const start = nodes[startPos.row][startPos.col];
  const end = nodes[endPos.row][endPos.col];
  const algo = algoSelect.value;
  const speed = parseInt(speedSelect.value, 10);

  const t0 = performance.now();
  let result;
  if (algo === 'bfs') result = bfs(start, end);
  else if (algo === 'dfs') result = dfs(start, end);
  else if (algo === 'dijkstra') result = dijkstra(start, end);
  else result = astar(start, end);
  const t1 = performance.now();

  const path = result.found ? reconstructPath(end) : [];

  statTime.textContent = Math.round(t1 - t0) + 'ms';
  await animate(result.visitedOrder, path, speed);

  statResult.textContent = result.found ? `path found (${path.length} steps)` : 'no path';
}

function generateMaze() {
  if (isAnimating) return;
  resetPathVisuals();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const node = nodes[r][c];
      const isWall = !isEndpoint(r, c) && Math.random() < 0.28;
      node.isWall = isWall;
      cellEls[r][c].classList.toggle('wall', isWall);
    }
  }
  statVisited.textContent = '0';
  statPath.textContent = '0';
  statResult.textContent = '—';
}

function clearPathOnly() {
  if (isAnimating) return;
  resetPathVisuals();
  resetAlgoState();
  statVisited.textContent = '0';
  statPath.textContent = '0';
  statResult.textContent = '—';
}

function clearBoard() {
  if (isAnimating) return;
  buildGrid();
  clearPathOnly();
}

visualizeBtn.addEventListener('click', runVisualization);
mazeBtn.addEventListener('click', generateMaze);
clearPathBtn.addEventListener('click', clearPathOnly);
clearBtn.addEventListener('click', clearBoard);

buildGrid();
