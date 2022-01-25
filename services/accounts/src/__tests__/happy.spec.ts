import { app, store } from "@rotorsoft/eventually";
import { PostgresStore } from "@rotorsoft/eventually-pg";
import { sleep } from "@rotorsoft/eventually-test";
import { Chance } from "chance";
import * as commands from "../accounts.commands";
import * as events from "../accounts.events";
import * as policies from "../accounts.policies";
import * as systems from "../accounts.systems";
import * as schemas from "../accounts.schemas";

const chance = new Chance();

store(PostgresStore("happy".concat(chance.guid()).replace(/-/g, "")));

app()
  .withSchemas<commands.Commands>({
    CreateAccount1: schemas.CreateAccount1,
    CreateAccount2: schemas.CreateAccount2,
    CreateAccount3: schemas.CreateAccount3,
    CompleteIntegration: schemas.CompleteIntegration
  })
  .withSchemas<events.Events>({
    AccountCreated: schemas.AccountCreated,
    Account1Created: schemas.Account1Created,
    Account2Created: schemas.Account2Created,
    Account3Created: schemas.Account3Created,
    IntegrationCompleted: schemas.IntegrationCompleted
  })
  .withEventHandlers(
    policies.IntegrateAccount1,
    policies.IntegrateAccount2,
    policies.IntegrateAccount3,
    policies.WaitForAllAndComplete
  )
  .withCommandHandlers(
    systems.ExternalSystem1,
    systems.ExternalSystem2,
    systems.ExternalSystem3,
    systems.ExternalSystem4
  )
  .build();

const trigger = (id: string): any => ({
  id: 1,
  version: 1,
  stream: "main",
  created: new Date(),
  name: "AccountCreated",
  data: { id }
});

describe("happy path", () => {
  beforeAll(async () => {
    await app().listen();
  });

  afterAll(async () => {
    await app().close();
  });

  it("should complete integration 1-2", async () => {
    const t = trigger(chance.guid());

    // given
    await app().event(policies.IntegrateAccount1, t);
    await sleep(100);

    // when
    await app().event(policies.IntegrateAccount2, t);
    await sleep(1000);

    // then
    const [seed] = (
      await app().query({ names: ["Account1Created"], after: -1, limit: 100 })
    ).filter((e) => e.data.id === t.data.id);
    const snapshots = await app().stream(
      policies.WaitForAllAndComplete(seed as any)
    );
    expect(snapshots.length).toBe(2);
    expect(snapshots[0].state.id).toBe(t.data.id);
    expect(snapshots[1].state.id).toBe(t.data.id);
    expect(snapshots[0].state.account1).toBeDefined();
    expect(snapshots[0].state.account3).not.toBeDefined();
    expect(snapshots[1].state.account1).toBeDefined();
    expect(snapshots[1].state.account3).toBeDefined();
  });

  it("should complete integration 2-1", async () => {
    const t = trigger(chance.guid());

    // given
    await app().event(policies.IntegrateAccount2, t);
    await sleep(1000);

    // when
    await app().event(policies.IntegrateAccount1, t);
    await sleep(1000);

    // then
    const [seed] = (
      await app().query({ names: ["Account1Created"], after: -1, limit: 100 })
    ).filter((e) => e.data.id === t.data.id);
    const snapshots = await app().stream(
      policies.WaitForAllAndComplete(seed as any)
    );
    expect(snapshots.length).toBe(2);
    expect(snapshots[0].state.id).toBe(t.data.id);
    expect(snapshots[1].state.id).toBe(t.data.id);
    expect(snapshots[0].state.account3).toBeDefined();
    expect(snapshots[0].state.account1).not.toBeDefined();
    expect(snapshots[1].state.account1).toBeDefined();
    expect(snapshots[1].state.account3).toBeDefined();

    // expect flow events
    const [sys2] = (
      await app().query({
        stream: systems.ExternalSystem2().stream()
      })
    ).filter((e) => e.data.id === t.data.id);
    const [sys3] = (
      await app().query({
        stream: systems.ExternalSystem3().stream()
      })
    ).filter((e) => e.data.id === t.data.id);
    const [sys4] = (
      await app().query({
        stream: systems.ExternalSystem4().stream()
      })
    ).filter((e) => e.data.id === t.data.id);
    expect(sys2.id).toBeLessThan(sys3.id);
    expect(sys3.id).toBeLessThan(sys4.id);
  });
});
