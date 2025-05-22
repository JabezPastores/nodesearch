import React, { useState, useRef, useEffect } from 'react';
import './App.css';

// Node class for A* pathfinding
class AStarNode {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.g = 0;
    this.h = 0;
    this.f = 0;
    this.parent = null;
  }
}

function App() {
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedTool, setSelectedTool] = useState('node');
  const [startNode, setStartNode] = useState(null);
  const [endNode, setEndNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [firstSelectedNode, setFirstSelectedNode] = useState(null);
  const [connectionWeight, setConnectionWeight] = useState('1');
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [visitedNodes, setVisitedNodes] = useState(new Set());
  const [path, setPath] = useState([]);
  const [currentNode, setCurrentNode] = useState(null);

  const canvasRef = useRef(null);

  const heuristic = (nodeA, nodeB) => {
    const dx = nodeA.x - nodeB.x;
    const dy = nodeA.y - nodeB.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const runAStar = async () => {
    if (!startNode || !endNode) {
      alert('Please set both start and end nodes');
      return;
    }

    setIsSimulating(true);
    setVisitedNodes(new Set());
    setPath([]);
    setCurrentNode(null);

    const start = nodes.find(n => n.id === startNode);
    const end = nodes.find(n => n.id === endNode);

    const updatedNodes = nodes.map(node => ({
      ...node,
      gScore: node.id === startNode ? 0 : Infinity,
      fScore: node.id === startNode ? heuristic(start, end) : Infinity,
      previousNode: null
    }));

    const openSet = [startNode];
    const cameFrom = {};
    const gScore = { [startNode]: 0 };
    const fScore = { [startNode]: heuristic(start, end) };

    while (openSet.length > 0) {
      openSet.sort((a, b) => (fScore[a] || Infinity) - (fScore[b] || Infinity));
      const currentId = openSet.shift();
      const current = updatedNodes.find(n => n.id === currentId);

      setCurrentNode(currentId);
      setVisitedNodes(prev => new Set([...prev, currentId]));
      await new Promise(resolve => setTimeout(resolve, 50)); // Yield control to browser

      if (currentId === endNode) {
        const path = [currentId];
        let currentInPath = currentId;
        while (cameFrom[currentInPath]) {
          currentInPath = cameFrom[currentInPath];
          path.unshift(currentInPath);
        }
        setPath(path);
        setIsSimulating(false);
        return;
      }

      const neighbors = connections
        .filter(conn => conn.from === currentId || conn.to === currentId)
        .map(conn => (conn.from === currentId ? conn.to : conn.from));

      for (const neighborId of neighbors) {
        const connection = connections.find(
          conn => (conn.from === currentId && conn.to === neighborId) ||
                  (conn.from === neighborId && conn.to === currentId)
        );

        const tentativeGScore = (gScore[currentId] || 0) + (connection?.weight || 1);

        if (tentativeGScore < (gScore[neighborId] || Infinity)) {
          cameFrom[neighborId] = currentId;
          gScore[neighborId] = tentativeGScore;
          fScore[neighborId] = gScore[neighborId] + heuristic(
            updatedNodes.find(n => n.id === neighborId),
            end
          );

          if (!openSet.includes(neighborId)) {
            openSet.push(neighborId);
          }
        }
      }
    }

    alert('No path found!');
    setIsSimulating(false);
  };

  const generateRandomMaze = () => {
    const gridSize = 5;
    const spacing = 120;
    const offsetX = 60;
    const offsetY = 60;

    const newNodes = [];
    const newConnections = [];

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const id = `node-${y}-${x}`;
        newNodes.push({ id, x: offsetX + x * spacing, y: offsetY + y * spacing });
      }
    }

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const currentId = `node-${y}-${x}`;
        if (x < gridSize - 1) {
          const rightId = `node-${y}-${x + 1}`;
          newConnections.push({ from: currentId, to: rightId, weight: Math.floor(Math.random() * 9) + 1 });
        }
        if (y < gridSize - 1) {
          const downId = `node-${y + 1}-${x}`;
          newConnections.push({ from: currentId, to: downId, weight: Math.floor(Math.random() * 9) + 1 });
        }
      }
    }

    setNodes(newNodes);
    setConnections(newConnections);
    setStartNode(newNodes[0].id);
    setEndNode(newNodes[newNodes.length - 1].id);
    setVisitedNodes(new Set());
    setPath([]);
  };

  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedNode = nodes.find(node => {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 20;
    });

    if (clickedNode) {
      if (selectedTool === 'delete') {
        handleDeleteNode(clickedNode.id);
        return;
      }

      if (selectedTool === 'connect') {
        if (!firstSelectedNode) {
          setFirstSelectedNode(clickedNode);
        } else if (firstSelectedNode !== clickedNode) {
          setPendingConnection({
            from: firstSelectedNode.id,
            to: clickedNode.id
          });
          setShowWeightInput(true);
          setFirstSelectedNode(null);
        }
        return;
      }

      if (selectedTool === 'start') {
        setStartNode(clickedNode.id);
      } else if (selectedTool === 'end') {
        setEndNode(clickedNode.id);
      } else if (selectedTool === 'node') {
        setSelectedNode(clickedNode.id);
      }
    } else {
      const newNode = {
        id: Date.now().toString(),
        x,
        y,
        type: selectedTool === 'start' ? 'start' :
              selectedTool === 'end' ? 'end' : 'node'
      };

      setNodes([...nodes, newNode]);

      if (selectedTool === 'start') setStartNode(newNode.id);
      if (selectedTool === 'end') setEndNode(newNode.id);
      setSelectedNode(newNode.id);
    }
  };

  const handleDeleteNode = (nodeId) => {
    setNodes(nodes.filter(node => node.id !== nodeId));
    setConnections(conns =>
      conns.filter(conn => conn.from !== nodeId && conn.to !== nodeId)
    );
    if (startNode === nodeId) setStartNode(null);
    if (endNode === nodeId) setEndNode(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    connections.forEach(conn => {
      const from = nodes.find(n => n.id === conn.from);
      const to = nodes.find(n => n.id === conn.to);
      if (from && to) {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.stroke();
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.fillText(conn.weight.toString(), midX + 5, midY - 5);
      }
    });

    nodes.forEach(node => {
      const isVisited = visitedNodes.has(node.id);
      const isInPath = path.includes(node.id);
      const isCurrent = currentNode === node.id;

      ctx.beginPath();
      ctx.arc(node.x, node.y, 15, 0, Math.PI * 2);

      if (isCurrent) {
        ctx.fillStyle = '#ffeb3b';
      } else if (isInPath) {
        ctx.fillStyle = '#9c27b0';
      } else if (isVisited) {
        ctx.fillStyle = '#ff9800';
      } else if (node.id === startNode) {
        ctx.fillStyle = '#4caf50';
      } else if (node.id === endNode) {
        ctx.fillStyle = '#f44336';
      } else {
        ctx.fillStyle = '#2196f3';
      }

      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    canvas.style.cursor = selectedTool === 'delete' ? 'pointer' : 'default';
  }, [nodes, connections, startNode, endNode, selectedTool, visitedNodes, path, currentNode]);

  return (
    <div className="app">
      <h1>Node-based Pathfinding Visualizer</h1>
      <div className="toolbar">
        <button className={`tool-button ${selectedTool === 'node' ? 'active' : ''}`} onClick={() => setSelectedTool('node')}>Add Node</button>
        <button className={`tool-button ${selectedTool === 'start' ? 'active' : ''}`} onClick={() => setSelectedTool('start')}>Set Start</button>
        <button className={`tool-button ${selectedTool === 'end' ? 'active' : ''}`} onClick={() => setSelectedTool('end')}>Set End</button>
        <button className={`tool-button ${selectedTool === 'connect' ? 'active' : ''}`} onClick={() => setSelectedTool('connect')}>Connect Nodes</button>
        <button className={`tool-button ${selectedTool === 'delete' ? 'active' : ''}`} onClick={() => setSelectedTool('delete')}>Delete Node</button>
        <button className="tool-button" onClick={generateRandomMaze}>Generate Maze</button>
        <button className={`tool-button ${selectedTool === 'simulate' ? 'active' : ''}`} onClick={() => { setSelectedTool('simulate'); runAStar(); }} disabled={isSimulating}>
          {isSimulating ? 'Simulating...' : 'A* Simulation'}
        </button>
      </div>

      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onClick={handleCanvasClick}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      {showWeightInput && (
        <div className="weight-dialog">
          <input
            type="number"
            min="1"
            value={connectionWeight}
            onChange={(e) => setConnectionWeight(e.target.value)}
            placeholder="Enter weight"
          />
          <button onClick={() => {
            if (pendingConnection) {
              setConnections([...connections, {
                ...pendingConnection,
                weight: parseInt(connectionWeight) || 1
              }]);
            }
            setShowWeightInput(false);
            setPendingConnection(null);
            setFirstSelectedNode(null);
            setConnectionWeight('1');
          }}>Add Connection</button>
          <button onClick={() => {
            setShowWeightInput(false);
            setPendingConnection(null);
            setFirstSelectedNode(null);
          }}>Cancel</button>
        </div>
      )}
    </div>
  );
}

export default App;
