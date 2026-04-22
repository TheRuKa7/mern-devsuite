/**
 * Audit hash-chain tests.
 *
 * The chain is the core SOC-2 CC7.2 tamper-detection control, so we
 * test it at three layers:
 *
 *   1. Happy path — verifyChain() returns ok=true after N appends.
 *   2. Tampering — mutating a row's payload breaks the chain at the
 *      right index, not before.
 *   3. Deletion — dropping the middle of the chain is detected as a
 *      prevHash mismatch on the next row.
 *
 * We bypass HTTP for these — the hash chain is a pure service.
 */
import { describe, expect, it } from "vitest";
import { AuditModel } from "../src/db/audit.model.js";
import { appendAudit, verifyChain } from "../src/services/audit.js";

describe("audit hash chain", () => {
  it("accepts a fresh chain and reports ok", async () => {
    const before = await verifyChain();
    expect(before).toEqual({ ok: true, checked: 0 });

    for (let i = 0; i < 5; i++) {
      await appendAudit({
        action: "test.event",
        resource: "test",
        metadata: { i },
      });
    }

    const result = await verifyChain();
    expect(result).toEqual({ ok: true, checked: 5 });
  });

  it("links seq monotonically and chains prevHash correctly", async () => {
    await appendAudit({ action: "a", resource: "x" });
    await appendAudit({ action: "b", resource: "x" });
    await appendAudit({ action: "c", resource: "x" });

    const events = await AuditModel.find().sort({ seq: 1 }).lean().exec();
    expect(events.map((e) => e.seq)).toEqual([0, 1, 2]);
    expect(events[0]!.prevHash).toBe("GENESIS");
    expect(events[1]!.prevHash).toBe(events[0]!.hash);
    expect(events[2]!.prevHash).toBe(events[1]!.hash);
  });

  it("detects tampering — mutating a middle row breaks the chain there", async () => {
    for (let i = 0; i < 4; i++) {
      await appendAudit({
        action: "op",
        resource: "row",
        metadata: { i },
      });
    }

    // Tamper with seq=1's action. The hash on disk stays the same, but
    // recomputing will produce a different value → detection.
    await AuditModel.updateOne(
      { seq: 1 },
      { $set: { action: "op.tampered" } },
    );

    const result = await verifyChain();
    expect(result.ok).toBe(false);
    expect(result.brokenAt).toBe(1);
    expect(result.checked).toBe(1); // successfully verified seq=0 before breaking
  });

  it("detects deletion — dropping a row breaks the chain at the successor", async () => {
    for (let i = 0; i < 3; i++) {
      await appendAudit({
        action: "op",
        resource: "row",
        metadata: { i },
      });
    }

    await AuditModel.deleteOne({ seq: 1 });

    const result = await verifyChain();
    expect(result.ok).toBe(false);
    // seq=2's prevHash still points at the deleted seq=1's hash, but
    // our walker now sees seq=0's hash as prev — mismatch at seq=2.
    expect(result.brokenAt).toBe(2);
  });

  it("concurrent appends serialise cleanly (no duplicate seq)", async () => {
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        appendAudit({
          action: "concurrent",
          resource: "x",
          metadata: { i },
        }),
      ),
    );

    const events = await AuditModel.find().sort({ seq: 1 }).lean().exec();
    expect(events).toHaveLength(20);
    expect(events.map((e) => e.seq)).toEqual(
      Array.from({ length: 20 }, (_, i) => i),
    );
    const result = await verifyChain();
    expect(result.ok).toBe(true);
  });
});
