import type { ConductorNotificationEffect } from "../conductor";
import type { INotificationRouter } from "./INotificationRouter";

/**
 * DI contract for the conductor notification dispatcher.
 */
export interface IConductorNotificationDispatcher {
  /**
   * Routes one conductor notification effect to the appropriate notification level.
   *
   * @param {ConductorNotificationEffect} notification Notification effect from conductor policy.
   * @returns {void}
   */
  dispatch(notification: ConductorNotificationEffect): void;
}

/**
 * Creates a conductor notification dispatcher bound to one notification router.
 *
 * @param {INotificationRouter} router Host notification router.
 * @returns {IConductorNotificationDispatcher} Bound dispatcher.
 */
export function createConductorNotificationDispatcher(
  router: INotificationRouter
): IConductorNotificationDispatcher {
  return {
    dispatch(notification: ConductorNotificationEffect): void {
      if (notification.level === "error") {
        void router.error(notification.message);
        return;
      }

      if (notification.level === "warn") {
        void router.warn(notification.message);
        return;
      }

      void router.info(notification.message);
    },
  };
}
