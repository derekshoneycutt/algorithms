export type { IViewHost } from "./IViewHost";
export { createViewHost } from "./viewHost";
export { getSmokeControlsSidebarViewId } from "./viewIds";
export { getRunControlsSidebarViewId } from "./viewIds";
export { getEnvironmentControlsSidebarViewId } from "./viewIds";
export { getWorkspaceAlgorithmsTreeViewId } from "./viewIds";
export { getWorkspaceStandardLibraryTreeViewId } from "./viewIds";
export {
	registerControlsChannels,
} from "./controlsChannelRegistration";
export type {
	ControlsChannelRegistrations,
	RegisterControlsChannelsInput,
} from "./controlsChannelRegistration";
export {
	createWorkspaceWatcherAdapter,
} from "./workspaceWatcherAdapter";
export type {
	CreateWorkspaceWatcherAdapterInput,
	IWorkspaceWatcherAdapter,
} from "./workspaceWatcherAdapter";
export {
	createWorkspaceAlgorithmsTreeDataProvider,
	createWorkspaceStandardLibraryTreeDataProvider,
	createLanguageStatusDecorationProvider,
} from "./trees";
export type {
	RefreshableWorkspaceTreeDataProvider,
	WorkspaceTreeNode,
} from "./trees";
export type {
	CoordinatorViewLayer,
	CreateCoordinatorViewLayerInput,
} from "./createCoordinatorViewLayer";
export { createCoordinatorViewLayer } from "./createCoordinatorViewLayer";
export type { CreateCoordinatorControlsChannelsInput } from "./createCoordinatorControlsChannels";
export { createCoordinatorControlsChannels } from "./createCoordinatorControlsChannels";
