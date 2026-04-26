/**
 * DI contract for host-side notification routing.
 */
export interface INotificationRouter {
  /**
   * Shows an informational notification.
   *
   * @param {string} message Informational message.
   * @returns {Thenable<string | undefined>} User response when actions are present.
   */
  info(message: string): Thenable<string | undefined>;

  /**
   * Shows a warning notification.
   *
   * @param {string} message Warning message.
   * @returns {Thenable<string | undefined>} User response when actions are present.
   */
  warn(message: string): Thenable<string | undefined>;

  /**
   * Shows an error notification.
   *
   * @param {string} message Error message.
   * @returns {Thenable<string | undefined>} User response when actions are present.
   */
  error(message: string): Thenable<string | undefined>;
}
