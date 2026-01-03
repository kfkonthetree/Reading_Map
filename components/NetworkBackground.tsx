import React, { useEffect, useState, useMemo } from 'react';

// A node represents a "city" or "book stop"
interface MapNode {
  id: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  size: number;
}

const NetworkBackground: React.FC = () => {
  const [nodes, setNodes] = useState<MapNode[]>([]);
  
  // Initialize random nodes
  useEffect(() => {
    const nodeCount = 8;
    const newNodes: MapNode[] = [];
    for (let i = 0; i < nodeCount; i++) {
      newNodes.push({
        id: `node-${i}`,
        x: 10 + Math.random() * 80, // Keep away from extreme edges
        y: 15 + Math.random() * 70,
        size: 2 + Math.random() * 3
      });
    }
    setNodes(newNodes);
  }, []);

  // Animate nodes gently drifting
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes(prev => prev.map(node => ({
        ...node,
        x: node.x + (Math.random() - 0.5) * 0.15,
        y: node.y + (Math.random() - 0.5) * 0.15
      })));
    }, 50); // Smooth update
    return () => clearInterval(interval);
  }, []);

  // Generate curved paths (Bezier curves) between some nodes
  const paths = useMemo(() => {
    if (nodes.length === 0) return [];
    const generatedPaths = [];
    
    // Create a chain plus some random extra connections
    for (let i = 0; i < nodes.length; i++) {
        // Connect to next node (circular)
        const start = nodes[i];
        const end = nodes[(i + 1) % nodes.length];
        
        // Calculate a control point for the Quadratic Bezier curve to create an "Arc"
        // The control point pulls the line away from the center
        const mx = (start.x + end.x) / 2;
        const my = (start.y + end.y) / 2;
        // Add an offset to make it curve
        const curveIntensity = 15; 
        const controlX = mx + (Math.random() > 0.5 ? curveIntensity : -curveIntensity);
        const controlY = my - curveIntensity; // Arc upwards usually looks like flight paths

        generatedPaths.push({
            id: `path-${i}`,
            d: `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`
        });
        
        // Add random cross connection occasionally
        if (Math.random() > 0.7) {
            const randomTarget = nodes[Math.floor(Math.random() * nodes.length)];
            if (randomTarget.id !== start.id) {
                 generatedPaths.push({
                    id: `path-rnd-${i}`,
                    d: `M ${start.x} ${start.y} Q ${mx} ${my + 10} ${randomTarget.x} ${randomTarget.y}`
                });
            }
        }
    }
    return generatedPaths;
  }, [nodes]);

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none opacity-40">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          {/* Gradient for fading lines */}
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#064e3b" stopOpacity="0" />
            <stop offset="50%" stopColor="#064e3b" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Draw Curved Flight Paths */}
        {paths.map((path, idx) => (
          <path
            key={path.id}
            d={path.d}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="0.15"
            className="animate-dash"
            style={{
                strokeDasharray: '3, 3',
                animation: `dashMove ${10 + idx * 2}s linear infinite`
            }}
          />
        ))}

        {/* Draw Nodes (Locations) */}
        {nodes.map((node, idx) => (
          <g key={node.id}>
             {/* Pulsing ring */}
            <circle
              cx={node.x}
              cy={node.y}
              r={node.size * 1.5}
              fill="none"
              stroke="#a7f3d0"
              strokeWidth="0.1"
              className="animate-ping"
              style={{ animationDuration: `${2 + idx * 0.5}s` }}
            />
            {/* Core dot */}
            <circle
              cx={node.x}
              cy={node.y}
              r={node.size * 0.4}
              fill="#064e3b"
            />
          </g>
        ))}
      </svg>
      
      <style>{`
        @keyframes dashMove {
          from { stroke-dashoffset: 50; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
};

export default NetworkBackground;