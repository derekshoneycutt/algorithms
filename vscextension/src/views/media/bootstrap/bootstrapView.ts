import { createBootstrapCommsFacade } from "./comms";
import { createBootstrapBridge } from "./bridges";
import { createBootstrapUi } from "./ui";

(() => {
  const comms = createBootstrapCommsFacade();
  const ui = createBootstrapUi();
  const bridge = createBootstrapBridge({
    comms,
    ui,
  });

  bridge.start();
})();
