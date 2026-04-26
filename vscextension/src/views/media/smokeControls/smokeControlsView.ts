import { createSmokeControlsCommsFacade } from "./comms";
import { createSmokeControlsBridge } from "./bridges";
import { createSmokeControlsUi } from "./ui";

(() => {
  const comms = createSmokeControlsCommsFacade();
  const ui = createSmokeControlsUi();
  const bridge = createSmokeControlsBridge({
    comms,
    ui,
  });

  bridge.start();
})();
