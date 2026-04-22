/**
 * Audit service — tamper-evident append + chain verification.
 *
 * # How the chain works
 *
 * Each event stores a `hash = sha256(prevHash || canonical(payload))`.
 * `canonical(payload)` serialises the event with a stable key order,
 * so re-computing it later is deterministic. An auditor can walk the
 * collection by `seq` ascending and check:
 *
 *     for i from 1..N:
 *       expected = sha256(events[i-1].hash || canonical(events[i] without hash))
 *       assert expected === events[i].hash
 *
 * Any tampering — edited row, inserted row, dropped row — breaks this
 * equality at the first affected index. We surface the broken index
 * so operators can isolate the incident.
 *
 * # Why not a Merkle tree?
 *
 * A linear hash chain is enough for "append-only detection", which is
 * the SOC-2 CC7.2 / ISO 27001 A.12.4 control. A Merkle tree would let
 * us prove inclusion without revealing the whole log — future work if
 * we ever ship audit-as-a-public-feed.
 *
 * # Concurrency caveat
 *
 * The `seq` counter is fetched + incremented in a single
 * `findOneAndUpdate` on a counter document (not shown here for
 * brevity; a production impl would use `db.counters` with upsert).
 * In this starter we use a simple in-memory mutex inside a single
 * process; horizontal scaling requires the counter collection.
 */
import { createHash } from "node:crypto";
import type { Types } from "mongoose";
import { AuditModel } from "../db/audit.model.js";

/** Input to append — everything except hash chain fields. */
export interface AuditInput {
  actorId?: string | Types.ObjectId | null;
  workspaceId?: string | Types.ObjectId | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Shape returned by `.lean()` over AuditModel. Mongoose's inferred lean
 * type widens to `FlattenMaps<unknown>` in our setup (the `metadata:
 * Mixed` field defeats inference), so we pin it explicitly here and
 * pass it as the `.lean<T>()` generic at call sites.
 */
interface AuditLean {
  seq: number;
  actorId?: Types.ObjectId | string | null;
  workspaceId?: Types.ObjectId | string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
  prevHash: string;
  hash: string;
  createdAt: Date;
}

// Stable JSON: recursively sort keys so the canonical form is
// deterministic. Nested objects get the same treatment. Arrays keep
// their order (order is semantically meaningful for ordered data).
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ":" + canonical(obj[k]));
  return "{" + parts.join(",") + "}";
}

function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** The genesis seed — first event's prevHash. */
export const GENESIS = "GENESIS";

/** Pure helper — used by both `append` and `verifyChain`. */
export function computeHash(
  prevHash: string,
  payload: Omit<AuditInput, never> & { seq: number; createdAt: Date },
): string {
  return sha256(prevHash + canonical(payload));
}

// Simple in-process serialiser — ensures seq allocation + hash linkage
// is atomic even under concurrent `append()` calls. This is sufficient
// for a single-instance deployment; a cluster needs a counter doc.
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  // Keep the chain alive even if `fn` throws; callers see their own error.
  queue = next.catch(() => undefined);
  return next;
}

export async function appendAudit(input: AuditInput) {
  return serialize(async () => {
    const last = await AuditModel.findOne()
      .sort({ seq: -1 })
      .lean<AuditLean | null>()
      .exec();
    const seq = (last?.seq ?? -1) + 1;
    const prevHash = last?.hash ?? GENESIS;
    const createdAt = new Date();

    const payload = {
      seq,
      actorId: input.actorId ? String(input.actorId) : null,
      workspaceId: input.workspaceId ? String(input.workspaceId) : null,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata ?? {},
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      createdAt,
    };
    const hash = computeHash(prevHash, payload);

    return AuditModel.create({ ...payload, prevHash, hash });
  });
}

export interface ChainVerification {
  ok: boolean;
  checked: number;
  brokenAt?: number;
  reason?: string;
}

/** Walk the chain and return the first break, or ok=true. */
export async function verifyChain(): Promise<ChainVerification> {
  const cursor = AuditModel.find()
    .sort({ seq: 1 })
    .lean<AuditLean>()
    .cursor();
  let prevHash = GENESIS;
  let checked = 0;
  for await (const ev of cursor as AsyncIterable<AuditLean>) {
    const expectedPrev = prevHash;
    if (ev.prevHash !== expectedPrev) {
      return {
        ok: false,
        checked,
        brokenAt: ev.seq,
        reason: `prevHash mismatch at seq ${ev.seq}`,
      };
    }
    const recomputed = computeHash(prevHash, {
      seq: ev.seq,
      actorId: ev.actorId ? String(ev.actorId) : null,
      workspaceId: ev.workspaceId ? String(ev.workspaceId) : null,
      action: ev.action,
      resource: ev.resource,
      resourceId: ev.resourceId ?? null,
      metadata: ev.metadata ?? {},
      ip: ev.ip ?? null,
      userAgent: ev.userAgent ?? null,
      createdAt: ev.createdAt as Date,
    });
    if (recomputed !== ev.hash) {
      return {
        ok: false,
        checked,
        brokenAt: ev.seq,
        reason: `hash mismatch at seq ${ev.seq}`,
      };
    }
    prevHash = ev.hash;
    checked += 1;
  }
  return { ok: true, checked };
}
