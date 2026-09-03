import { createSignal, onMount, For, Show } from "solid-js";
import * as d3 from "d3";
import Plus from "lucide-solid/icons/plus";

import PromptDialog from "../../components/dialogs/PromptDialog";

// Experimental alternative to the /flow page (@dschz/solid-flow): a
// minimal node/edge canvas built directly on d3 instead of a flow
// library. d3-zoom handles pan/zoom and d3.line() draws edges; node
// dragging and connection-dragging are plain Pointer Events, the same
// pattern already used by Focus's drag-to-reorder and Graph's
// right-click relation dragging. State is in-memory only for now, not
// persisted to PocketBase.
interface FlowNode {
  id: string;
  x: number;
  y: number;
  label: string;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
}

const INITIAL_NODES: FlowNode[] = [
  { id: "1", x: 120, y: 80, label: "Input" },
  { id: "2", x: 340, y: 220, label: "Process" },
  { id: "3", x: 120, y: 360, label: "Output" },
];

const INITIAL_EDGES: FlowEdge[] = [{ id: "e1-2", source: "1", target: "2" }];

const NODE_WIDTH = 140;
const NODE_HEIGHT = 48;

export default function D3Flow() {
  const [nodes, setNodes] = createSignal<FlowNode[]>(INITIAL_NODES);
  const [edges, setEdges] = createSignal<FlowEdge[]>(INITIAL_EDGES);
  const [addingNode, setAddingNode] = createSignal(false);

  const handleAddNode = async (label: string) => {
    setNodes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        // Staggered so repeated adds don't stack exactly on top of
        // each other.
        x: 200 + prev.length * 20,
        y: 200 + prev.length * 20,
        label,
      },
    ]);
  };

  return (
    <div class="flex h-full min-h-0 w-full flex-1 flex-col gap-4">
      <div class="mb-4 flex items-center justify-between">
        <h1 class="font-sans text-4xl">D3Flow</h1>
        <button
          type="button"
          class="btn flex items-center gap-1.5"
          onClick={() => setAddingNode(true)}
        >
          <Plus size={16} />
          Add node
        </button>
      </div>
      <D3FlowCanvas
        nodes={nodes()}
        edges={edges()}
        onNodeMove={(id, x, y) =>
          setNodes((prev) =>
            prev.map((n) => (n.id === id ? { ...n, x, y } : n)),
          )
        }
        onConnect={(source, target) =>
          setEdges((prev) => [
            ...prev,
            { id: `e${source}-${target}-${prev.length}`, source, target },
          ])
        }
      />
      <PromptDialog
        open={addingNode()}
        onOpenChange={setAddingNode}
        title="New node"
        label="Label"
        initialValue=""
        onSubmit={handleAddNode}
        errorMessage="Failed to create the node."
      />
    </div>
  );
}

// Split out from D3Flow so the SVG/d3-zoom setup only runs once this
// component is mounted, matching Graph/GraphCanvas's own split.
function D3FlowCanvas(props: {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodeMove: (id: string, x: number, y: number) => void;
  onConnect: (source: string, target: string) => void;
}) {
  let svgRef: SVGSVGElement | undefined;
  const [transform, setTransform] = createSignal(d3.zoomIdentity);
  // The in-progress connection line while dragging from a node's
  // handle, or null when nothing is being connected.
  const [pendingLine, setPendingLine] = createSignal<{
    sourceId: string;
    x: number;
    y: number;
  } | null>(null);

  onMount(() => {
    if (!svgRef) return;

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 2])
      // Panning should only start on empty canvas, not when the drag
      // began on a node or its connection handle -- those have their
      // own pointer handlers below (see handleNodeDragStart /
      // handleConnectionStart).
      .filter((event) => !event.target.closest("[data-node]"))
      .on("zoom", (event) => setTransform(event.transform));

    d3.select(svgRef).call(zoomBehavior);
  });

  // Converts a pointer event's screen coordinates into flow-space
  // coordinates, undoing the current zoom/pan transform.
  const toFlowPoint = (event: PointerEvent) => {
    if (!svgRef) return { x: 0, y: 0 };
    const rect = svgRef.getBoundingClientRect();
    const [x, y] = transform().invert([
      event.clientX - rect.left,
      event.clientY - rect.top,
    ]);
    return { x, y };
  };

  const nodeById = (id: string) => props.nodes.find((n) => n.id === id);

  const handleNodeDragStart = (node: FlowNode) => (event: PointerEvent) => {
    const start = toFlowPoint(event);
    const offsetX = start.x - node.x;
    const offsetY = start.y - node.y;

    const handleMove = (moveEvent: PointerEvent) => {
      const point = toFlowPoint(moveEvent);
      props.onNodeMove(node.id, point.x - offsetX, point.y - offsetY);
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  // Drag from a node's right-edge handle to draw a new edge. The drop
  // target is resolved by hit-testing the pointerup position against
  // every element with a "data-node" attribute, the same manual
  // approach Graph uses for its own relation-dragging.
  const handleConnectionStart = (node: FlowNode) => (event: PointerEvent) => {
    event.stopPropagation();
    const point = toFlowPoint(event);
    setPendingLine({ sourceId: node.id, x: point.x, y: point.y });

    const handleMove = (moveEvent: PointerEvent) => {
      const movePoint = toFlowPoint(moveEvent);
      setPendingLine({ sourceId: node.id, x: movePoint.x, y: movePoint.y });
    };
    const handleUp = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setPendingLine(null);

      const dropTarget = document
        .elementsFromPoint(upEvent.clientX, upEvent.clientY)
        .map((el) => el.closest("[data-node]"))
        .find((el) => el !== null);
      const targetId = dropTarget?.getAttribute("data-node");
      if (targetId && targetId !== node.id) {
        props.onConnect(node.id, targetId);
      }
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  // Straight line between two nodes' right/left mid-points, drawn with
  // d3's own path generator instead of a hand-built path string.
  const edgePath = (edge: FlowEdge) => {
    const source = nodeById(edge.source);
    const target = nodeById(edge.target);
    if (!source || !target) return "";
    return (
      d3.line()([
        [source.x + NODE_WIDTH, source.y + NODE_HEIGHT / 2],
        [target.x, target.y + NODE_HEIGHT / 2],
      ]) ?? ""
    );
  };

  return (
    <svg
      ref={svgRef}
      class="h-[500px] w-full flex-1 touch-none rounded-md border border-border bg-field"
    >
      <g transform={transform().toString()}>
        <For each={props.edges}>
          {(edge) => (
            <path
              d={edgePath(edge)}
              fill="none"
              stroke="var(--color-border)"
              stroke-width="2"
            />
          )}
        </For>
        <Show when={pendingLine()}>
          {(line) => {
            const source = nodeById(line().sourceId);
            if (!source) return null;
            return (
              <line
                x1={source.x + NODE_WIDTH}
                y1={source.y + NODE_HEIGHT / 2}
                x2={line().x}
                y2={line().y}
                stroke="var(--color-hover-border)"
                stroke-width="2"
                stroke-dasharray="4"
              />
            );
          }}
        </Show>
        <For each={props.nodes}>
          {(node) => (
            <g
              data-node={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              class="cursor-grab touch-none active:cursor-grabbing"
              onPointerDown={handleNodeDragStart(node)}
            >
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={8}
                fill="var(--color-card)"
                stroke="var(--color-border)"
              />
              <text
                x={NODE_WIDTH / 2}
                y={NODE_HEIGHT / 2}
                dominant-baseline="middle"
                text-anchor="middle"
                fill="var(--color-text)"
                class="pointer-events-none select-none"
              >
                {node.label}
              </text>
              {/* Connection handle: dragging from here starts a new edge. */}
              <circle
                cx={NODE_WIDTH}
                cy={NODE_HEIGHT / 2}
                r={6}
                fill="var(--color-hover-border)"
                class="cursor-crosshair"
                onPointerDown={handleConnectionStart(node)}
              />
            </g>
          )}
        </For>
      </g>
    </svg>
  );
}
