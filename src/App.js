import React, { useState, useRef, useEffect } from 'react';
import './App.css';

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
  const [algorithm, setAlgorithm] = useState('astar'); // 'astar', 'bfs', 'dfs'
  const [isPaused, setIsPaused] = useState(false);
  const [nodeValue, setNodeValue] = useState('');
  const [showNodeValueInput, setShowNodeValueInput] = useState(false);
  const [nodeToEdit, setNodeToEdit] = useState(null);
  const canvasRef = useRef(null);
  const simulationRef = useRef(null);

  const heuristic = (nodeA, nodeB) => {
    const dx = nodeA.x - nodeB.x;
    const dy = nodeA.y - nodeB.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If nodeA has a value, use it to adjust the heuristic
    const nodeValue = nodeA.value ? parseInt(nodeA.value) || 0 : 0;
    
    // The higher the value, the more "costly" it is to visit this node
    // This will make the A* algorithm prefer paths through nodes with lower values
    return distance + nodeValue;
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

    try {
      const start = nodes.find(n => n.id === startNode);
      const end = nodes.find(n => n.id === endNode);

      if (!start || !end) {
        alert('Start or end node not found');
        setIsSimulating(false);
        return;
      }

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
      let foundPath = false;
      const visited = new Set();

      while (openSet.length > 0 && !foundPath) {
        openSet.sort((a, b) => (fScore[a] || Infinity) - (fScore[b] || Infinity));
        const currentId = openSet.shift();
        const current = updatedNodes.find(n => n.id === currentId);
        if (!currentId || !current) continue;

        setCurrentNode(currentId);
        visited.add(currentId);
        setVisitedNodes(new Set(visited));
        await new Promise(resolve => setTimeout(resolve, 50));

        if (currentId === endNode) {
          const path = [currentId];
          let step = currentId;
          while (cameFrom[step]) {
            step = cameFrom[step];
            path.unshift(step);
          }
          setPath(path);
          foundPath = true;
          break;
        }

        const neighbors = connections
          .filter(conn => conn.from === currentId || conn.to === currentId)
          .map(conn => (conn.from === currentId ? conn.to : conn.from));

        for (const neighborId of neighbors) {
          const connection = connections.find(
            conn => (conn.from === currentId && conn.to === neighborId) ||
                    (conn.from === neighborId && conn.to === currentId)
          );

          // Get the current node and neighbor node objects
          const currentNode = updatedNodes.find(n => n.id === currentId);
          const neighborNode = updatedNodes.find(n => n.id === neighborId);
          
          if (!neighborNode) continue;
          
          // Calculate the cost to move to the neighbor node
          // Include both the connection weight and the neighbor's node value
          const connectionCost = connection?.weight || 1;
          const nodeValueCost = neighborNode.value ? parseInt(neighborNode.value) || 0 : 0;
          
          // The total cost is the sum of the current g-score, the connection weight, and the neighbor's value
          const tentativeG = (gScore[currentId] || 0) + connectionCost + nodeValueCost;

          if (tentativeG < (gScore[neighborId] || Infinity)) {
            cameFrom[neighborId] = currentId;
            gScore[neighborId] = tentativeG;

            // We already have the neighborNode from above
            // Calculate f-score: g-score + heuristic
            fScore[neighborId] = tentativeG + heuristic(neighborNode, end);

            if (!openSet.includes(neighborId)) {
              openSet.push(neighborId);
            }
          }
        }
      }

      if (!foundPath) alert('No path found!');
    } catch (error) {
      console.error('Error during pathfinding:', error);
      alert('An error occurred during pathfinding.');
    } finally {
      setIsSimulating(false);
      setCurrentNode(null);
    }
  };

  const runBFS = async () => {
    if (!startNode || !endNode) {
      alert('Please set both start and end nodes');
      return;
    }

    setIsSimulating(true);
    setVisitedNodes(new Set());
    setPath([]);
    setCurrentNode(null);

    try {
      const queue = [[startNode]];
      const visited = new Set([startNode]);
      let found = false;
      let currentPath = [];

      while (queue.length > 0 && !found && !isPaused) {
        currentPath = queue.shift();
        const currentNodeId = currentPath[currentPath.length - 1];
        
        setCurrentNode(currentNodeId);
        setVisitedNodes(new Set([...visited]));
        
        await new Promise(resolve => {
          simulationRef.current = setTimeout(resolve, 200);
        });

        if (currentNodeId === endNode) {
          found = true;
          setPath(currentPath);
          break;
        }

        const neighbors = connections
          .filter(conn => conn.from === currentNodeId || conn.to === currentNodeId)
          .map(conn => conn.from === currentNodeId ? conn.to : conn.from)
          .filter(id => !visited.has(id));

        for (const neighbor of neighbors) {
          visited.add(neighbor);
          queue.push([...currentPath, neighbor]);
        }
      }

      if (!found && !isPaused) {
        alert('No path found!');
      }
    } catch (error) {
      console.error('Error during BFS:', error);
      alert('An error occurred during BFS');
    } finally {
      if (!isPaused) {
        setIsSimulating(false);
        setCurrentNode(null);
      }
    }
  };

  const runDFS = async () => {
    if (!startNode || !endNode) {
      alert('Please set both start and end nodes');
      return;
    }

    setIsSimulating(true);
    setVisitedNodes(new Set());
    setPath([]);
    setCurrentNode(null);

    try {
      const stack = [[startNode]];
      const visited = new Set([startNode]);
      let found = false;
      let currentPath = [];

      while (stack.length > 0 && !found && !isPaused) {
        currentPath = stack.pop();
        const currentNodeId = currentPath[currentPath.length - 1];
        
        setCurrentNode(currentNodeId);
        setVisitedNodes(new Set([...visited]));
        
        await new Promise(resolve => {
          simulationRef.current = setTimeout(resolve, 500);
        });

        if (currentNodeId === endNode) {
          found = true;
          setPath(currentPath);
          break;
        }

        const neighbors = connections
          .filter(conn => conn.from === currentNodeId || conn.to === currentNodeId)
          .map(conn => conn.from === currentNodeId ? conn.to : conn.from)
          .filter(id => !visited.has(id));

        // Push neighbors in reverse order to visit left-to-right
        for (let i = neighbors.length - 1; i >= 0; i--) {
          visited.add(neighbors[i]);
          stack.push([...currentPath, neighbors[i]]);
        }
      }

      if (!found && !isPaused) {
        alert('No path found!');
      }
    } catch (error) {
      console.error('Error during DFS:', error);
      alert('An error occurred during DFS');
    } finally {
      if (!isPaused) {
        setIsSimulating(false);
        setCurrentNode(null);
      }
    }
  };

  const runSelectedAlgorithm = () => {
    if (algorithm === 'astar') {
      runAStar();
    } else if (algorithm === 'bfs') {
      runBFS();
    } else if (algorithm === 'dfs') {
      runDFS();
    }
  };

  const pauseSimulation = () => {
    setIsPaused(true);
    if (simulationRef.current) {
      clearTimeout(simulationRef.current);
    }
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    setIsPaused(false);
    setVisitedNodes(new Set());
    setPath([]);
    setCurrentNode(null);
    if (simulationRef.current) {
      clearTimeout(simulationRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        clearTimeout(simulationRef.current);
      }
    };
  }, []);

  const generateRandomMaze = () => {
    const nodeCount = 15, minDistance = 100, maxTries = 1000;
    const canvasWidth = 800, canvasHeight = 600, margin = 50;
    const newNodes = [], newConnections = [], connectedPairs = new Set();

    for (let i = 0; i < nodeCount; i++) {
      let attempts = 0, validPosition = false, x, y;
      while (!validPosition && attempts < maxTries) {
        x = margin + Math.random() * (canvasWidth - 2 * margin);
        y = margin + Math.random() * (canvasHeight - 2 * margin);

        validPosition = newNodes.every(node => {
          const dx = node.x - x, dy = node.y - y;
          return Math.sqrt(dx * dx + dy * dy) >= minDistance;
        });
        attempts++;
      }
      if (validPosition) {
        // Generate a random value between 1 and 10 for each node
        const value = Math.floor(Math.random() * 10) + 1;
        newNodes.push({ id: `node-${i}`, x, y, value: value.toString() });
      }
    }

    const maxConnections = Math.min(3, newNodes.length - 1);
    newNodes.forEach((node, i) => {
      const otherNodes = newNodes.filter((_, j) => i !== j).map(n => ({
        ...n,
        distance: Math.hypot(n.x - node.x, n.y - node.y)
      })).sort((a, b) => a.distance - b.distance);

      let connectionsMade = 0;
      for (const otherNode of otherNodes) {
        if (connectionsMade >= maxConnections) break;
        const pairId = [node.id, otherNode.id].sort().join('-');
        if (!connectedPairs.has(pairId)) {
          const wouldCross = newConnections.some(conn => {
            const a = newNodes.find(n => n.id === conn.from);
            const b = newNodes.find(n => n.id === conn.to);
            return doLinesIntersect(
              { x: node.x, y: node.y }, { x: otherNode.x, y: otherNode.y },
              { x: a.x, y: a.y }, { x: b.x, y: b.y }
            );
          });
          if (!wouldCross) {
            newConnections.push({ from: node.id, to: otherNode.id, weight: Math.floor(Math.random() * 9) + 1 });
            connectedPairs.add(pairId);
            connectionsMade++;
          }
        }
      }
    });

    setNodes(newNodes);
    setConnections(newConnections);
    setStartNode(newNodes[0]?.id || null);
    setEndNode(newNodes[newNodes.length - 1]?.id || null);
    setVisitedNodes(new Set());
    setPath([]);
  };

  const doLinesIntersect = (p1, p2, p3, p4) => {
    const ccw = (A, B, C) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
    return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
  };

  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const clickedNode = nodes.find(node => {
      const dx = node.x - x, dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 20;
    });

    if (clickedNode) {
      if (selectedTool === 'delete') return handleDeleteNode(clickedNode.id);
      if (selectedTool === 'connect') {
        if (!firstSelectedNode) return setFirstSelectedNode(clickedNode);
        if (firstSelectedNode !== clickedNode) {
          setPendingConnection({ from: firstSelectedNode.id, to: clickedNode.id });
          setShowWeightInput(true);
          setFirstSelectedNode(null);
        }
        return;
      }
      if (selectedTool === 'value') {
        setNodeToEdit(clickedNode.id);
        setNodeValue(clickedNode.value || '');
        setShowNodeValueInput(true);
        return;
      }
      if (selectedTool === 'start') setStartNode(clickedNode.id);
      else if (selectedTool === 'end') setEndNode(clickedNode.id);
      else if (selectedTool === 'node') setSelectedNode(clickedNode.id);
    } else {
      const newNode = { id: Date.now().toString(), x, y, value: '' };
      setNodes([...nodes, newNode]);
      if (selectedTool === 'start') setStartNode(newNode.id);
      if (selectedTool === 'end') setEndNode(newNode.id);
      setSelectedNode(newNode.id);
    }
  };

  const handleDeleteNode = (nodeId) => {
    setNodes(nodes.filter(node => node.id !== nodeId));
    setConnections(conns => conns.filter(conn => conn.from !== nodeId && conn.to !== nodeId));
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
      ctx.fillStyle = isCurrent ? '#ffeb3b' : isInPath ? '#9c27b0' : isVisited ? '#ff9800' : node.id === startNode ? '#4caf50' : node.id === endNode ? '#f44336' : '#2196f3';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Display node value if it exists
      if (node.value) {
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.value, node.x, node.y);
      }
    });

    canvas.style.cursor = selectedTool === 'delete' ? 'pointer' : 'default';
  }, [nodes, connections, startNode, endNode, selectedTool, visitedNodes, path, currentNode]);

  return (
    <div className="app">
      <h1>Node-based Pathfinding Visualizer</h1>
<div className="toolbar">
        <div className="tool-group">
          <select 
            value={algorithm} 
            onChange={(e) => setAlgorithm(e.target.value)}
            disabled={isSimulating}
          >
            <option value="astar">A* Algorithm</option>
            <option value="bfs">Breadth-First Search</option>
            <option value="dfs">Depth-First Search</option>
          </select>
          
          <button 
            className="control-button start"
            onClick={runSelectedAlgorithm} 
            disabled={isSimulating || !startNode || !endNode}
          >
            {isPaused ? 'Resume' : 'Start Simulation'}
          </button>
          
          {isSimulating && (
            <button 
              className="control-button pause"
              onClick={pauseSimulation}
            >
              Pause
            </button>
          )}
          
          <button 
            className="control-button reset"
            onClick={resetSimulation}
            disabled={!isSimulating && !isPaused}
          >
            Reset
          </button>
          
          <button 
            className="control-button generate"
            onClick={generateRandomMaze} 
            disabled={isSimulating}
          >
            Generate Maze
          </button>
        </div>
      
        <div className="tool-group">
          <button className={`tool-button ${selectedTool === 'node' ? 'active' : ''}`} onClick={() => setSelectedTool('node')}>Add Node</button>
          <button className={`tool-button ${selectedTool === 'value' ? 'active' : ''}`} onClick={() => setSelectedTool('value')}>Set Value</button>
          <button className={`tool-button ${selectedTool === 'start' ? 'active' : ''}`} onClick={() => setSelectedTool('start')}>Set Start</button>
          <button className={`tool-button ${selectedTool === 'end' ? 'active' : ''}`} onClick={() => setSelectedTool('end')}>Set End</button>
          <button className={`tool-button ${selectedTool === 'connect' ? 'active' : ''}`} onClick={() => setSelectedTool('connect')}>Connect</button>
          <button className={`tool-button ${selectedTool === 'delete' ? 'active' : ''}`} onClick={() => setSelectedTool('delete')}>Delete</button>
        </div>
      </div>

      <div className="canvas-container">
        <canvas ref={canvasRef} width={800} height={600} onClick={handleCanvasClick} onContextMenu={e => e.preventDefault()} />
      </div>

      {showWeightInput && (
        <div className="weight-dialog">
          <input
            type="number"
            min="1"
            value={connectionWeight}
            onChange={e => setConnectionWeight(e.target.value)}
            placeholder="Enter weight"
          />
          <button onClick={() => {
            if (pendingConnection) {
              setConnections([...connections, { ...pendingConnection, weight: parseInt(connectionWeight) || 1 }]);
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
      
      {showNodeValueInput && (
        <div className="weight-dialog">
          <input
            type="text"
            value={nodeValue}
            onChange={e => setNodeValue(e.target.value)}
            placeholder="Enter node value"
          />
          <button onClick={() => {
            if (nodeToEdit) {
              setNodes(nodes.map(node => 
                node.id === nodeToEdit ? { ...node, value: nodeValue } : node
              ));
            }
            setShowNodeValueInput(false);
            setNodeToEdit(null);
            setNodeValue('');
          }}>Set Value</button>
          <button onClick={() => {
            setShowNodeValueInput(false);
            setNodeToEdit(null);
            setNodeValue('');
          }}>Cancel</button>
        </div>
      )}
    </div>
  );
}

export default App;
