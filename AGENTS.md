## Completed Tasks

The interactive demo now supports the remaining features from `TASKS.md`:

- **Connection Obstruction**: connection lines are rendered behind cards and automatic anchor points keep paths from crossing windows. Users can still double-click a line to add custom anchors.
- **Rebuild on Change**: whenever cards or connections are added or removed, the property graph is rebuilt so new dependencies are reflected immediately.
- **Real-Time Updates**: after rebuilding the graph, property values and the UI refresh to stay in sync with the node layout.
- **Trace Update**: the trace view used for tooltips updates whenever the dependency graph changes so users can inspect how values are computed.

All originally listed tasks have been implemented.
