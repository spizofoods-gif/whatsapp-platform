'use client';
import { useState, useCallback, useRef } from 'react';

interface FlowNode {
  id: string;
  type: 'trigger' | 'message' | 'condition' | 'action' | 'delay' | 'end';
  label: string;
  data: any;
  x: number;
  y: number;
  connections: string[];
}

const NODE_TYPES = [
  { type: 'trigger', label: '🎯 Trigger', color: '#3b82f6', desc: 'Start when user sends...' },
  { type: 'message', label: '💬 Message', color: '#25D366', desc: 'Send a text message' },
  { type: 'condition', label: '🔀 Condition', color: '#f59e0b', desc: 'Branch based on reply' },
  { type: 'action', label: '⚡ Action', color: '#8b5cf6', desc: 'Tag, notify, webhook' },
  { type: 'delay', label: '⏱️ Delay', color: '#64748b', desc: 'Wait before next step' },
  { type: 'end', label: '🏁 End', color: '#ef4444', desc: 'End conversation' },
];

export default function ChatbotBuilder() {
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [editingData, setEditingData] = useState<any>({});
  const [flowName, setFlowName] = useState('My Chatbot Flow');
  const [toast, setToast] = useState<{msg:string;type:string}|null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const notify = (msg: string, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const addNode = (type: string) => {
    const nt = NODE_TYPES.find(n => n.type === type);
    const id = 'node_' + Date.now();
    const newNode: FlowNode = {
      id,
      type: type as any,
      label: nt?.label || type,
      data: { message: '', keywords: '', condition: '', tag: '', action: '' },
      x: 100 + Math.random() * 300,
      y: 80 + nodes.length * 120,
      connections: [],
    };
    setNodes([...nodes, newNode]);
  };

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    dragRef.current = { id: nodeId, startX: e.clientX, startY: e.clientY, origX: node.x, origY: node.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setNodes(prev => prev.map(n =>
      n.id === dragRef.current!.id
        ? { ...n, x: dragRef.current!.origX + dx, y: dragRef.current!.origY + dy }
        : n
    ));
  };

  const handleMouseUp = () => { dragRef.current = null; };

  const handleConnect = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setNodes(prev => prev.map(n =>
      n.id === fromId
        ? { ...n, connections: [...n.connections.filter(c => c !== toId), toId] }
        : n
    ));
    notify('Connected!');
  };

  const openEditor = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setSelectedNode(nodeId);
    setEditingData({ ...node.data });
    setShowNodeEditor(true);
  };

  const saveNodeData = () => {
    if (!selectedNode) return;
    setNodes(prev => prev.map(n =>
      n.id === selectedNode ? { ...n, data: editingData } : n
    ));
    setShowNodeEditor(false);
  };

  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId).map(n => ({
      ...n,
      connections: n.connections.filter(c => c !== nodeId),
    })));
  };

  const getNodeColor = (type: string) => NODE_TYPES.find(n => n.type === type)?.color || '#64748b';

  const exportFlow = () => {
    const json = JSON.stringify({ name: flowName, nodes, version: '1.0' }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${flowName.replace(/\s+/g, '_')}.json`;
    a.click();
    notify('Flow exported!');
  };

  const importFlow = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        setNodes(data.nodes || []);
        setFlowName(data.name || 'Imported Flow');
        notify('Flow imported!');
      } catch { notify('Invalid file', 'error'); }
    };
    reader.readAsText(file);
  };

  const saveAsChatbotRule = async () => {
    // Convert flow to chatbot rules
    const triggerNode = nodes.find(n => n.type === 'trigger');
    const msgNodes = nodes.filter(n => n.type === 'message');

    if (!triggerNode || msgNodes.length === 0) {
      notify('Add a Trigger + at least one Message node', 'error');
      return;
    }

    for (const mn of msgNodes) {
      await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${flowName} - ${mn.id}`,
          trigger_type: 'keyword',
          trigger_keywords: triggerNode.data.keywords?.split(',').map((k: string) => k.trim()).filter(Boolean) || ['hello'],
          trigger_match: 'contains',
          response_text: mn.data.message || 'Hello!',
          is_active: true,
          priority: 0,
        }),
      });
    }
    notify(`Flow saved as ${msgNodes.length} chatbot rules!`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)', marginTop: -24 }}>
      {/* Toolbar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>🤖 Chatbot Flow Builder</h2>
          <input
            style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 12px', fontSize: 13 }}
            value={flowName}
            onChange={e => setFlowName(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
            📂 Import
            <input type="file" accept=".json" onChange={importFlow} style={{ display: 'none' }} />
          </label>
          <button className="btn btn-secondary btn-sm" onClick={exportFlow}>💾 Export</button>
          <button className="btn btn-primary btn-sm" onClick={saveAsChatbotRule}>⚡ Deploy as Chatbot Rules</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Node Palette */}
        <div style={{ width: 200, background: '#fff', borderRight: '1px solid #e2e8f0', padding: 12, overflowY: 'auto' }}>
          <h4 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: '#94a3b8', marginBottom: 10 }}>Nodes</h4>
          {NODE_TYPES.map(nt => (
            <div
              key={nt.type}
              onClick={() => addNode(nt.type)}
              style={{
                padding: '10px 12px',
                marginBottom: 6,
                borderRadius: 8,
                background: nt.color + '10',
                border: `1px solid ${nt.color}30`,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>{nt.label}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{nt.desc}</div>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: 10, background: '#fef3c7', borderRadius: 8, fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>
            <strong>💡 Tip:</strong> Click a node to edit. Drag to move. Click "+" on a node to connect.
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          style={{ flex: 1, position: 'relative', overflow: 'auto', background: '#f8fafc' }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Grid background */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            opacity: 0.5,
          }} />

          {/* Connection lines */}
          <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%', zIndex: 1 }}>
            {nodes.map(node =>
              node.connections.map(toId => {
                const to = nodes.find(n => n.id === toId);
                if (!to) return null;
                return (
                  <line
                    key={`${node.id}-${toId}`}
                    x1={node.x + 70}
                    y1={node.y + 35}
                    x2={to.x + 70}
                    y2={to.y + 35}
                    stroke="#94a3b8"
                    strokeWidth={2}
                    markerEnd="url(#arrowhead)"
                  />
                );
              })
            )}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
              </marker>
            </defs>
          </svg>

          {/* Nodes */}
          {nodes.map(node => (
            <div
              key={node.id}
              onMouseDown={e => handleMouseDown(e, node.id)}
              onClick={() => openEditor(node.id)}
              style={{
                position: 'absolute',
                left: node.x,
                top: node.y,
                width: 140,
                padding: '10px 12px',
                borderRadius: 12,
                background: '#fff',
                border: `2px solid ${selectedNode === node.id ? '#3b82f6' : getNodeColor(node.type)}`,
                boxShadow: selectedNode === node.id
                  ? '0 4px 16px rgba(59,130,246,0.3)'
                  : '0 2px 8px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                zIndex: 2,
                transition: 'box-shadow 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: getNodeColor(node.type) }}>{node.label}</div>
                <button
                  onClick={e => { e.stopPropagation(); deleteNode(node.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, opacity: 0.5 }}
                >✕</button>
              </div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {node.data.message || node.data.keywords || node.data.condition || '(click to edit)'}
              </div>
              {/* Connect button */}
              {connecting === node.id ? (
                <div style={{ fontSize: 10, marginTop: 4, color: '#3b82f6' }}>Click target node...</div>
              ) : (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (connecting) {
                      handleConnect(connecting, node.id);
                      setConnecting(null);
                    } else {
                      setConnecting(node.id);
                    }
                  }}
                  style={{
                    marginTop: 4,
                    fontSize: 10,
                    background: connecting ? '#dbeafe' : '#f1f5f9',
                    border: 'none',
                    borderRadius: 4,
                    padding: '2px 8px',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  {connecting ? `← Connect from ${nodes.find(n => n.id === connecting)?.label || ''}` : '+ Connect'}
                </button>
              )}
            </div>
          ))}

          {nodes.length === 0 && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              textAlign: 'center', color: '#94a3b8',
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🤖</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>Build Your Chatbot Flow</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Click a node type on the left panel to add it</div>
            </div>
          )}
        </div>
      </div>

      {/* Node Editor Modal */}
      {showNodeEditor && selectedNode && (
        <div className="modal-overlay" onClick={() => setShowNodeEditor(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>
                Edit {nodes.find(n => n.id === selectedNode)?.label}
              </h3>
              <button onClick={() => setShowNodeEditor(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div className="modal-body">
              {nodes.find(n => n.id === selectedNode)?.type === 'trigger' && (
                <>
                  <div className="mb-4">
                    <label className="label">Trigger Keywords (comma separated)</label>
                    <input className="input" placeholder="hello, hi, help, menu" value={editingData.keywords || ''} onChange={e => setEditingData({ ...editingData, keywords: e.target.value })} />
                  </div>
                  <div className="mb-4">
                    <label className="label">Match Type</label>
                    <select className="input" value={editingData.condition || 'contains'} onChange={e => setEditingData({ ...editingData, condition: e.target.value })}>
                      <option value="contains">Contains keyword</option>
                      <option value="exact">Exact match</option>
                      <option value="starts">Starts with</option>
                    </select>
                  </div>
                </>
              )}
              {nodes.find(n => n.id === selectedNode)?.type === 'message' && (
                <div className="mb-4">
                  <label className="label">Message Text</label>
                  <textarea className="input" rows={3} placeholder="Type your message here..." value={editingData.message || ''} onChange={e => setEditingData({ ...editingData, message: e.target.value })} style={{ resize: 'vertical' }} />
                </div>
              )}
              {nodes.find(n => n.id === selectedNode)?.type === 'condition' && (
                <>
                  <div className="mb-4">
                    <label className="label">If user reply contains...</label>
                    <input className="input" placeholder="yes, ok, sure" value={editingData.condition || ''} onChange={e => setEditingData({ ...editingData, condition: e.target.value })} />
                  </div>
                </>
              )}
              {nodes.find(n => n.id === selectedNode)?.type === 'action' && (
                <>
                  <div className="mb-4">
                    <label className="label">Action Type</label>
                    <select className="input" value={editingData.action || 'tag'} onChange={e => setEditingData({ ...editingData, action: e.target.value })}>
                      <option value="tag">Add Tag</option>
                      <option value="notify">Send Notification</option>
                      <option value="webhook">Call Webhook</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="label">Value</label>
                    <input className="input" placeholder="e.g., 'interested', 'https://...'" value={editingData.tag || ''} onChange={e => setEditingData({ ...editingData, tag: e.target.value })} />
                  </div>
                </>
              )}
              {nodes.find(n => n.id === selectedNode)?.type === 'delay' && (
                <div className="mb-4">
                  <label className="label">Delay (seconds)</label>
                  <input className="input" type="number" placeholder="5" value={editingData.delay || ''} onChange={e => setEditingData({ ...editingData, delay: e.target.value })} min={1} max={3600} />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowNodeEditor(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveNodeData}>Save</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
