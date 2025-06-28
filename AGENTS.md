## Pending Tasks

The following features are outlined in `TASKS.md` but are not yet implemented:

- **Connection Obstruction**: ensure lines never pass above cards and allow users to insert fixed anchor points along a path for manual rerouting.
- **Rebuild on Change**: whenever cards or connections are added or removed, rebuild the underlying property graph so that new dependencies are reflected in the generated calculation tree.
- **Real-Time Updates**: after rebuilding the graph, re-generate property values and refresh the UI so that displayed numbers stay in sync with the node layout.
- **Trace Update**: update the trace view used for tooltips whenever the dependency graph changes so users can inspect how values are computed.

These tasks remain open for future development.
