import { app, client, dispose, store } from "@rotorsoft/eventually";
import * as policies from "../accounts.policies";
import * as systems from "../accounts.systems";
import { trigger } from "./trigger";

app()
  .with(policies.IntegrateAccount1)
  .with(policies.IntegrateAccount2)
  .with(policies.IntegrateAccount3)
  .with(policies.WaitForAllAndComplete)
  .with(systems.ExternalSystem2)
  .with(systems.ExternalSystem3)
  .with(systems.ExternalSystem4)
  .with(systems.ExternalSystem1)
  .build();

describe("account flow failures", () => {
  beforeAll(async () => {
    await app().listen();
  });

  afterAll(async () => {
    await dispose()();
  });

  it("should throw and not commit anything", async () => {
    const t = trigger("crash-it");

    await client().event(policies.IntegrateAccount1, t);

    const spyCommit = jest.spyOn(store(), "commit");
    await expect(client().event(policies.IntegrateAccount2, t)).rejects.toThrow(
      "error completing integration"
    );
    expect(spyCommit).toHaveBeenCalledTimes(2);

    const { count: sys2 } = await client().query({
      stream: systems.ExternalSystem2().stream()
    });
    const { count: sys3 } = await client().query({
      stream: systems.ExternalSystem3().stream()
    });
    const { count: sys4 } = await client().query({
      stream: systems.ExternalSystem4().stream()
    });

    expect(sys2).toBe(0);
    expect(sys3).toBe(0);
    expect(sys4).toBe(0);
  });
});
