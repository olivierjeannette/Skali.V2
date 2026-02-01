'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  type Connection,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Button } from '@/components/ui/button';
import { Save, Play, Trash2, Undo, Redo } from 'lucide-react';
import { nodeTypes } from './workflow-node';
import { WorkflowSidebar } from './workflow-sidebar';
import { WorkflowNodeConfig } from './workflow-node-config';
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowCanvasData,
  TriggerType,
  ActionType,
  WorkflowNodeData,
} from '@/types/workflow.types';

// =====================================================
// TYPES
// =====================================================

interface WorkflowEditorProps {
  workflowId: string;
  initialData?: WorkflowCanvasData;
  onSave: (data: WorkflowCanvasData) => Promise<void>;
  onTest?: () => void;
  isActive?: boolean;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

let nodeId = 0;
const getNodeId = () => `node_${++nodeId}`;

// =====================================================
// WORKFLOW EDITOR
// =====================================================

function WorkflowEditorInner({
  initialData,
  onSave,
  onTest,
  isActive = false,
}: WorkflowEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(
    ((initialData?.nodes || []) as unknown) as Node[]
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    ((initialData?.edges || []) as unknown) as Edge[]
  );
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    setHasChanges(true);
  }, [nodes, edges]);

  // Handle node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Handle edge connection
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        ...params,
        id: `e${params.source}-${params.target}`,
        type: 'smoothstep',
        animated: false,
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const dataStr = event.dataTransfer.getData('application/reactflow');

      if (!dataStr) return;

      const { type, subType, label } = JSON.parse(dataStr) as {
        type: 'trigger' | 'action';
        subType: TriggerType | ActionType;
        label: string;
      };

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: getNodeId(),
        type,
        position,
        data: {
          label,
          ...(type === 'trigger'
            ? { trigger_type: subType, trigger_config: {} }
            : { action_type: subType, action_config: {} }),
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  // Handle node data update
  const onNodeDataChange = useCallback(
    (nodeId: string, newData: Partial<WorkflowNodeData>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...newData } }
            : node
        )
      );
      // Update selected node if it's the one being edited
      if (selectedNode?.id === nodeId) {
        setSelectedNode((prev) =>
          prev ? { ...prev, data: { ...prev.data, ...newData } } : null
        );
      }
    },
    [setNodes, selectedNode]
  );

  // Handle delete selected
  const onDeleteSelected = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) =>
        eds.filter(
          (e) => e.source !== selectedNode.id && e.target !== selectedNode.id
        )
      );
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes, setEdges]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!reactFlowInstance) return;

    setIsSaving(true);
    try {
      const viewport = reactFlowInstance.getViewport();
      const canvasData: WorkflowCanvasData = {
        nodes: (nodes as unknown) as WorkflowNode[],
        edges: (edges as unknown) as WorkflowEdge[],
        viewport,
      };
      await onSave(canvasData);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, reactFlowInstance, onSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Delete key
      if (event.key === 'Delete' && selectedNode) {
        onDeleteSelected();
      }
      // Ctrl+S to save
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, onDeleteSelected, handleSave]);

  return (
    <div className="flex h-full">
      {/* Sidebar with draggable nodes */}
      <WorkflowSidebar />

      {/* Main editor area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              <Undo className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Redo className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-gray-200 mx-2" />
            <Button
              variant="outline"
              size="sm"
              onClick={onDeleteSelected}
              disabled={!selectedNode}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Supprimer
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-sm text-amber-600">Modifications non enregistrees</span>
            )}
            {onTest && (
              <Button
                variant="outline"
                size="sm"
                onClick={onTest}
                disabled={!isActive}
              >
                <Play className="w-4 h-4 mr-1" />
                Tester
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-1" />
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>

        {/* React Flow canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultEdgeOptions={{
              type: 'smoothstep',
              style: { strokeWidth: 2 },
            }}
            connectionLineStyle={{ strokeWidth: 2 }}
            proOptions={{ hideAttribution: true }}
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          </ReactFlow>
        </div>
      </div>

      {/* Node configuration panel */}
      {selectedNode && (
        <WorkflowNodeConfig
          node={(selectedNode as unknown) as WorkflowNode}
          onUpdate={(data) => onNodeDataChange(selectedNode.id, data)}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}

// =====================================================
// EXPORTED COMPONENT (with provider)
// =====================================================

export function WorkflowEditor(props: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner {...props} />
    </ReactFlowProvider>
  );
}
