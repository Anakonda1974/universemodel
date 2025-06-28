# Development Tasks

This document outlines tasks for improving the interactive demo and underlying
engine. These tasks are suggestions for future work and are not yet
implemented.

## Card Interaction Improvements

- **Drag and Drop Enhancements**: allow card dragging while preserving
  connections. Provide visual feedback when a card is being moved.
- **Connection Highlighting**: highlight compatible input/output ports when a
  connection is being dragged to streamline wire creation.
- **Multiple Selection**: support selecting multiple cards to move them as a
  group.
- **Context Menu**: add a right‑click context menu for quick actions such as
  deleting a card or clearing its connections.

## Connector and Wire Handling

- **Anchor Editing**: make it easier to add or remove anchor points by
  double‑clicking wires. Provide handles that can be dragged to adjust the
  path.
- **Undo/Redo Support**: maintain a history of connection changes so the user can
  undo mistakes.
- **Snap To Grid**: ensure wires snap to grid positions defined by the "Snap"
  input field to keep layouts tidy.
- **Connection Validation**: prevent invalid connections, such as linking an
  output port to itself or creating circular dependencies.

## Dynamic Calculation Tree

- **Rebuild on Change**: whenever cards or connections are added or removed,
  rebuild the underlying property graph so that new dependencies are reflected
  in the generated calculation tree.
- **Real‑Time Updates**: after rebuilding the graph, re‑generate property values
  and refresh the UI so that displayed numbers stay in sync with the node
  layout.
- **Trace Update**: update the trace view used for tooltips whenever the
  dependency graph changes so users can inspect how values are computed.


