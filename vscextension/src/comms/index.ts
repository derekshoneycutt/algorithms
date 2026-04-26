export type { ICommunicationHub } from "./ICommunicationHub";
export { createCommunicationHub } from "./communicationHub";
export type {
	HostToViewMessage,
	SmokeControlsViewSnapshot,
	ViewSmokeControlIntent,
	ViewToHostMessage,
} from "./shared/messageTypes";
export {
	isHostToViewMessage,
	isViewSmokeControlIntent,
	isViewToHostMessage,
} from "./shared/messageTypes";
