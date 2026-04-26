import { renderUiCoreStatusPanel } from "../../shared";

/**
 * Bootstrap panel UI surface.
 */
export interface IBootstrapUi {
  /**
   * Marks the panel as connected to host comms.
   *
   * @param {string} status Status label.
   * @returns {void}
   */
  setStatus(status: string): void;
}

/**
 * Creates the bootstrap panel UI adapter.
 *
 * @returns {IBootstrapUi} Bootstrap UI adapter.
 */
export function createBootstrapUi(): IBootstrapUi {
  const appRoot = document.querySelector("[data-role='bootstrap-app']");

  const renderStatus = (status: string): void => {
    if (!(appRoot instanceof HTMLElement)) {
      return;
    }

    renderUiCoreStatusPanel(appRoot, {
      title: "Bootstrap Webview",
      description: "Lit-based shared UI core is active.",
      status,
    });
  };

  renderStatus("booting");

  return {
    setStatus(status: string): void {
      renderStatus(status);
    },
  };
}
