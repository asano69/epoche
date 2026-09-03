import { createSignal, createEffect, onMount, on, For, Show } from "solid-js";
import * as d3 from "d3";
import dagre from "@dagrejs/dagre";

const NODE_WIDTH = 140;
const NODE_HEIGHT = 48;

export interface GraphNode {
  id: string;
  label: string;
}

export interface GraphEdge {
  id: string;
  // Project this edge is derived FROM ("subject" in the "relations"
  // collection).
  source: string;
  // Project derived from `source` ("object" in the "relations"
  // collection).
  target: string;
}

export interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  // Called when the user drags from one node's connection handle to
  // another, to record a new derivation relation (source -> target).
  onConnect: (sourceId: string, targetId: string) => void;
  // Called with an edge's id when the user clicks it, so the parent
  // can confirm and delete that relation.
  onDeleteEdge: (edgeId: string) => void;
}

interface PositionedNode extends GraphNode {
  x: number;
  y: number;
}

// Runs dagre's layered layout algorithm to compute a one-off initial
// layout for the DAG of derivation relations. Unlike a generic force
// simulation, dagre is built specifically for directed graphs, so
// edges consistently point left-to-right, which reads naturally as
// "derived from". Once this returns, node positions are just plain
// numbers in a signal, moved only by the user's own drags -- there is
// no ongoing layout loop to reason about.
function computeLayout(nodes: GraphNode[], edges: GraphEdge[]): PositionedNode[] {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 100 });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  // dagre positions each node by its center; the rest of this
  // component (edgePath, node rendering) works in top-left
  // coordinates, so the offset is subtracted here once.
  return nodes.map((node) => {
    const { x, y } = graph.node(node.id);
    return { ...node, x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 };
  });
}

// Network graph of projects (nodes) and their derivation relations
// (directed edges, source -> target). Built directly on d3, following
// the same pan/zoom (d3-zoom) and pointer-based drag pattern as
// routes/graph/index-example.tsx, rather than a flow-graph library.
export default function GraphCanvas(props: GraphCanvasProps) {
  let svgRef: SVGSVGElement | undefined;
  const [transform, setTransform] = createSignal(d3.zoomIdentity);
  const [positioned, setPositioned] = createSignal<PositionedNode[]>([]);
  const [hoveredEdgeId, setHoveredEdgeId] = createSignal<string | null>(null);
  // The in-progress connection line while dragging from a node's
  // handle, or null when nothing is being connected.
  const [pendingLine, setPendingLine] = createSignal<{
    sourceId: string;
    x: number;
    y: number;
  } | null>(null);

  // Recomputes the layout only when the set of project ids changes,
  // so adding/removing a relation (which only changes props.edges)
  // never resets positions the user has already dragged into place.
  createEffect(
    on(
      () => props.nodes.map((n) => n.id).join(","),
      () => setPositioned(computeLayout(props.nodes, props.edges)),
    ),
  );

  onMount(() => {
    if (!svgRef) return;
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 2])
      // Panning should only start on empty canvas, not when the drag
      // began on a node or its connection handle.
      .filter((event) => !event.target.closest("[data-node]"))
      .on("zoom", (event) => setTransform(event.transform));

    d3.select(svgRef).call(zoomBehavior);
  });

  // Converts a pointer event's screen coordinates into graph-space
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

  const nodeById = (id: string) => positioned().find((n) => n.id === id);

  const handleNodeDragStart = (node: PositionedNode) => (event: PointerEvent) => {
    const start = toFlowPoint(event);
    const offsetX = start.x - node.x;
    const offsetY = start.y - node.y;

    const handleMove = (moveEvent: PointerEvent) => {
      const point = toFlowPoint(moveEvent);
      setPositioned((prev) =>
        prev.map((n) =>
          n.id === node.id
            ? { ...n, x: point.x - offsetX, y: point.y - offsetY }
            : n,
        ),
      );
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  // Drag from a node's right-edge handle to draw a new derivation
  // relation. The drop target is resolved by hit-testing the
  // pointerup position against every element with a "data-node"
  // attribute, the same approach as routes/graph/index-example.tsx.
  const handleConnectionStart = (node: PositionedNode) => (event: PointerEvent) => {
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

  // Draws a smooth cubic bezier between node centers, shortened near
  // the target so the arrowhead marker lands exactly on that node's
  // rectangular edge instead of being hidden underneath it (or, at
  // steep angles, stopping short and leaving a gap). The source end
  // is left at the node's center on purpose: nodes are drawn after
  // edges (see the <For each={positioned()}> block below), so the
  // portion of the curve inside the source rectangle is already
  // covered up.
  const edgePath = (edge: GraphEdge) => {
    const source = nodeById(edge.source);
    const target = nodeById(edge.target);
    if (!source || !target) return "";

    const sourceCenter: [number, number] = [
      source.x + NODE_WIDTH / 2,
      source.y + NODE_HEIGHT / 2,
    ];
    const targetCenter: [number, number] = [
      target.x + NODE_WIDTH / 2,
      target.y + NODE_HEIGHT / 2,
    ];
    const dx = targetCenter[0] - sourceCenter[0];
    const dy = targetCenter[1] - sourceCenter[1];
    const halfWidth = NODE_WIDTH / 2;
    const halfHeight = NODE_HEIGHT / 2;
    // Scales (dx, dy) down until it first touches the target
    // rectangle's left/right or top/bottom edge, whichever comes
    // first for this particular angle -- the standard way to find
    // where a ray from a rectangle's center exits through its
    // boundary.
    const scale =
      dx === 0 && dy === 0
        ? 0
        : 1 / Math.max(Math.abs(dx) / halfWidth, Math.abs(dy) / halfHeight);
    const targetEdge: [number, number] = [
      targetCenter[0] - dx * scale,
      targetCenter[1] - dy * scale,
    ];

    // Control points are pulled halfway along the horizontal distance
    // between the two endpoints, so the curve leaves the source and
    // enters the target roughly horizontally -- the familiar "S-curve"
    // shape used by most flow-chart/node-editor connections, and a
    // natural fit for the left-to-right rankdir the layout uses.
    const controlOffset = Math.abs(targetEdge[0] - sourceCenter[0]) / 2;
    const c1: [number, number] = [
      sourceCenter[0] + controlOffset,
      sourceCenter[1],
    ];
    const c2: [number, number] = [targetEdge[0] - controlOffset, targetEdge[1]];

    return `M${sourceCenter[0]},${sourceCenter[1]} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${targetEdge[0]},${targetEdge[1]}`;
  };

  return (
    <svg
      ref={svgRef}
      class="h-full min-h-[500px] w-full flex-1 touch-none rounded-md border border-border bg-field"
    >
      <defs>
        {/* Arrowhead marking the derivation direction (subject -> object). */}
        <marker
          id="graph-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0L10,5L0,10z" fill="var(--color-hover-border)" />
        </marker>
      </defs>
      <g transform={transform().toString()}>
        <For each={props.edges}>
          {(edge) => (
            <path
              d={edgePath(edge)}
              fill="none"
              stroke={
                hoveredEdgeId() === edge.id
                  ? "var(--color-hover-border)"
                  : "var(--color-border)"
              }
              stroke-width="2"
              marker-end="url(#graph-arrow)"
              class="cursor-pointer"
              onMouseEnter={() => setHoveredEdgeId(edge.id)}
              onMouseLeave={() => setHoveredEdgeId(null)}
              onClick={() => props.onDeleteEdge(edge.id)}
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
        <For each={positioned()}>
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
                class="pointer-events-none select-none text-sm"
              >
                {node.label}
              </text>
              {/* Connection handle: drag from here to draw a new
                  derivation relation to another node. */}
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
