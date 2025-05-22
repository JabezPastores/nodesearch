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

  const canvasRef = useRef(null);

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

    // Draw connections
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

        // Draw weight
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.fillText(conn.weight.toString(), midX + 5, midY - 5);
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 15, 0, Math.PI * 2);
      ctx.fillStyle =
        node.id === startNode ? '#4caf50' :
        node.id === endNode ? '#f44336' :
        '#2196f3';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Cursor for delete mode
    canvas.style.cursor = selectedTool === 'delete' ? 'pointer' : 'default';
  }, [nodes, connections, startNode, endNode, selectedTool]);

  return (
    <div className="app">
      <h1>Node-based Pathfinding Visualizer</h1>
      <div className="toolbar">
        <button
          className={`tool-button ${selectedTool === 'node' ? 'active' : ''}`}
          onClick={() => setSelectedTool('node')}
        >
          Add Node
        </button>
        <button
          className={`tool-button ${selectedTool === 'start' ? 'active' : ''}`}
          onClick={() => setSelectedTool('start')}
        >
          Set Start
        </button>
        <button
          className={`tool-button ${selectedTool === 'end' ? 'active' : ''}`}
          onClick={() => setSelectedTool('end')}
        >
          Set End
        </button>
        <button
          className={`tool-button ${selectedTool === 'connect' ? 'active' : ''}`}
          onClick={() => setSelectedTool('connect')}
        >
          Connect Nodes
        </button>
        <button
          className={`tool-button ${selectedTool === 'delete' ? 'active' : ''}`}
          onClick={() => setSelectedTool('delete')}
        >
          Delete Node
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
          }}>
            Add Connection
          </button>
          <button onClick={() => {
            setShowWeightInput(false);
            setPendingConnection(null);
            setFirstSelectedNode(null);
          }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
