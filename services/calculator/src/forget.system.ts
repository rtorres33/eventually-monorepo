import { bind, ExternalSystemFactory } from "@rotorsoft/eventually";
import { Commands, Events } from "@rotorsoft/calculator-artifacts";

// To test case when not reducible command handler produces events that are
// not registered with the builder and there are no local event handlers
export const Forget: ExternalSystemFactory<
  Pick<Commands, "Forget" | "Whatever">,
  Pick<Events, "Forgotten">
> = () => ({
  stream: () => "Forget",
  onWhatever: () => Promise.resolve([]),
  onForget: () => Promise.resolve([bind("Forgotten", {})])
});
