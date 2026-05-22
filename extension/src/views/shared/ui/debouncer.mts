/**
 * Simple timer-based debouncer for webview code.
 */
export class Debouncer {
	private readonly delayMilliseconds: number;

	private timeoutHandle: number | undefined;
	private pendingCallback: (() => void) | undefined;

	/**
	 * Creates a debouncer with one fixed delay.
	 *
	 * @param {number} delayMilliseconds Delay to wait before running the callback.
	 */
	public constructor(delayMilliseconds: number) {
		this.delayMilliseconds = delayMilliseconds;
		this.timeoutHandle = undefined;
		this.pendingCallback = undefined;
	}

	/**
	 * Schedules a callback to run after the current delay, replacing any pending callback.
	 *
	 * @param {() => void} callback Callback to run after the debounce delay.
	 * @returns {void} No return value.
	 */
	public schedule(callback: () => void): void {
		this.cancel();
		this.pendingCallback = callback;
		this.timeoutHandle = window.setTimeout(() => {
			this.timeoutHandle = undefined;
			this.pendingCallback = undefined;
			callback();
		}, this.delayMilliseconds);
	}

	/**
	 * Cancels any pending callback.
	 *
	 * @returns {void} No return value.
	 */
	public cancel(): void {
		if (this.timeoutHandle === undefined) {
			return;
		}

		window.clearTimeout(this.timeoutHandle);
		this.timeoutHandle = undefined;
		this.pendingCallback = undefined;
	}

	/**
	 * Runs a pending callback immediately, if one exists.
	 *
	 * @returns {void} No return value.
	 */
	public flush(): void {
		if (this.timeoutHandle === undefined || this.pendingCallback === undefined) {
			return;
		}

		const pendingHandle = this.timeoutHandle;
		const pendingCallback = this.pendingCallback;
		this.timeoutHandle = undefined;
		this.pendingCallback = undefined;
		window.clearTimeout(pendingHandle);
		pendingCallback();
	}
}
