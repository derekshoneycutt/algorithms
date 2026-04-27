import { createRunControlsCommsFacade } from "./comms";
import { createRunControlsBridge } from "./bridges";
import { createRunControlsUi } from "./ui";

(() => {
  const comms = createRunControlsCommsFacade();
  const ui = createRunControlsUi();
  const bridge = createRunControlsBridge({
    comms,
    ui,
  });

  bridge.start();
})();