import { createEnvironmentControlsCommsFacade } from "./comms";
import { createEnvironmentControlsBridge } from "./bridges";
import { createEnvironmentControlsUi } from "./ui";

(() => {
  const comms = createEnvironmentControlsCommsFacade();
  const ui = createEnvironmentControlsUi();
  const bridge = createEnvironmentControlsBridge({
    comms,
    ui,
  });

  bridge.start();
})();
