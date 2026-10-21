// The breakdown board on React Flow: pieces as cards, arrows labeled with what they mean. Drag to move, drag between handles to connect.
import "@xyflow/react/dist/style.css";

import { Background, Controls, MarkerType, ReactFlow, type Connection, type Edge, type NodeChange } from "@xyflow/react";
import { useMemo } from "react";

import type { BreakdownEdgeKind, BreakdownPlan } from "@shared/types/progress";

import { edgeKindLabel, layoutPositions, withEdge, withoutPiece, type BoardPosition } from "./boardModel";
import { PieceNode, type PieceFlowNode } from "./PieceNode";

/** The custom node types. Defined once, outside render, as React Flow asks. */
const NODE_TYPES = { piece: PieceNode };

/** Props for BreakdownBoard. */
interface BreakdownBoardProps
{
	readonly plan: BreakdownPlan;
	readonly positions: Readonly<Record<string, BoardPosition>>;
	readonly onPositionsChange?: (positions: Record<string, BoardPosition>) => void;
	readonly onPlanChange?: (plan: BreakdownPlan) => void;
	readonly selectedPieceId?: string | null;
	readonly onSelectPiece?: (pieceId: string | null) => void;

	/** The kind a new arrow drawn by dragging gets. */
	readonly newEdgeKind?: BreakdownEdgeKind;
	readonly readOnly?: boolean;
	readonly ariaLabel: string;
	readonly testId?: string;
}

/** A board for one plan. Read-only boards (the reference plan) can be panned but not changed. */
export function BreakdownBoard({ plan, positions, onPositionsChange, onPlanChange, selectedPieceId = null, onSelectPiece, newEdgeKind = "then", readOnly = false, ariaLabel, testId }: BreakdownBoardProps)
{
	const laidOut = useMemo(() => layoutPositions(plan, positions), [plan, positions]);

	const nodes: PieceFlowNode[] = plan.pieces.map((piece) => ({
		id: piece.id,
		type: "piece",
		position: laidOut[piece.id] ?? { x: 0, y: 0 },
		data: { piece, readOnly },
		selected: piece.id === selectedPieceId,
		draggable: !readOnly,
		connectable: !readOnly,
	}));

	const edges: Edge[] = plan.edges.map((edge) => ({
		id: `${edge.from}->${edge.to}:${edge.kind}`,
		source: edge.from,
		target: edge.to,
		label: edgeKindLabel(edge.kind),
		markerEnd: { type: MarkerType.ArrowClosed, color: "var(--color-paper-faint)" },
		style: { stroke: "var(--color-paper-faint)" },
		labelStyle: { fill: "var(--color-paper-muted)", fontSize: 11 },
		labelBgStyle: { fill: "var(--color-surface)" },
	}));

	/** Keeps dragged positions; selection and removal come through their own handlers. */
	const onNodesChange = (changes: NodeChange<PieceFlowNode>[]): void =>
	{
		const moved = changes.filter((change) => change.type === "position" && change.position);

		if (moved.length === 0 || !onPositionsChange) return;

		const next = { ...laidOut };

		for (const change of moved)
		{
			if (change.type === "position" && change.position) next[change.id] = change.position;
		}

		onPositionsChange(next);
	};

	/** A drag between two handles adds an arrow of the chosen kind. */
	const onConnect = (connection: Connection): void =>
	{
		if (connection.source && connection.target) onPlanChange?.(withEdge(plan, connection.source, connection.target, newEdgeKind));
	};

	return (
		<div data-testid={testId} aria-label={ariaLabel} role="group" className="h-full min-h-0 w-full overflow-hidden rounded-lg border border-line bg-ink">
			{/* Keyed by the piece count, so the view fits again whenever a piece is added or removed. */}
			<ReactFlow
				key={plan.pieces.length}
				nodes={nodes}
				edges={edges}
				nodeTypes={NODE_TYPES}
				colorMode="dark"
				fitView
				fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
				minZoom={0.3}
				maxZoom={1.5}
				proOptions={{ hideAttribution: true }}
				nodesDraggable={!readOnly}
				nodesConnectable={!readOnly}
				elementsSelectable={!readOnly}
				deleteKeyCode={readOnly ? null : "Delete"}
				onNodesChange={onNodesChange}
				onConnect={onConnect}
				onNodeClick={(_event, node) => onSelectPiece?.(node.id)}
				onPaneClick={() => onSelectPiece?.(null)}
				onNodesDelete={(deleted) => onPlanChange?.(deleted.reduce((current, node) => withoutPiece(current, node.id), plan))}
				onEdgesDelete={(deleted) => onPlanChange?.({ ...plan, edges: plan.edges.filter((edge) => !deleted.some((removed) => removed.id === `${edge.from}->${edge.to}:${edge.kind}`)) })}
				style={{ background: "var(--color-ink)" }}
			>
				<Background color="var(--color-line)" gap={24} size={1} />
				<Controls showInteractive={false} />
			</ReactFlow>
		</div>
	);
}
