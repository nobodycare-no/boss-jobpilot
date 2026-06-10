import type { DatabaseSync } from "node:sqlite";

import {
  ApplicationCreateSchema,
  ApplicationEventSchema,
  ApplicationSchema,
  type Application,
  type ApplicationCreateInput,
  type ApplicationEvent,
  type ApplicationUpdateInput
} from "@boss-jobpilot/shared";

type ApplicationRow = {
  id: string;
  job_id: string;
  resume_version_id: string | null;
  greeting_variant: string;
  status: string;
  greeting_message: string | null;
  applied_at: string | null;
  next_follow_up_at: string | null;
  outcome: string | null;
  created_at: string;
  updated_at: string;
};

type ApplicationEventRow = {
  id: string;
  application_id: string;
  type: string;
  content: string | null;
  occurred_at: string;
};

export type ApplicationRepository = ReturnType<typeof createApplicationRepository>;

export function createApplicationRepository(db: DatabaseSync) {
  return {
    listByJobId(jobId: string) {
      const rows = db
        .prepare(
          `
          SELECT *
          FROM applications
          WHERE job_id = ?
          ORDER BY updated_at DESC, created_at DESC
        `
        )
        .all(jobId) as ApplicationRow[];

      return rows.map(rowToApplication);
    },

    listEventsByApplicationId(applicationId: string) {
      const rows = db
        .prepare(
          `
          SELECT *
          FROM application_events
          WHERE application_id = ?
          ORDER BY occurred_at ASC
        `
        )
        .all(applicationId) as ApplicationEventRow[];

      return rows.map(rowToApplicationEvent);
    },

    getLatestByJobId(jobId: string) {
      const row = db
        .prepare(
          `
          SELECT *
          FROM applications
          WHERE job_id = ?
          ORDER BY updated_at DESC, created_at DESC
          LIMIT 1
        `
        )
        .get(jobId) as ApplicationRow | undefined;

      return row ? rowToApplication(row) : undefined;
    },

    get(id: string) {
      const row = db
        .prepare(
          `
          SELECT *
          FROM applications
          WHERE id = ?
        `
        )
        .get(id) as ApplicationRow | undefined;

      return row ? rowToApplication(row) : undefined;
    },

    create(input: ApplicationCreateInput) {
      const now = new Date().toISOString();
      const item = ApplicationSchema.parse({
        ...ApplicationCreateSchema.parse(input),
        id: input.id ?? crypto.randomUUID(),
        createdAt: input.createdAt ?? now,
        updatedAt: input.updatedAt ?? now
      });

      db.prepare(
        `
        INSERT INTO applications (
          id,
          job_id,
          resume_version_id,
          greeting_variant,
          status,
          greeting_message,
          applied_at,
          next_follow_up_at,
          outcome,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).run(
        item.id,
        item.jobId,
        item.resumeVersionId ?? null,
        item.greetingVariant,
        item.status,
        item.greetingMessage,
        item.appliedAt ?? null,
        item.nextFollowUpAt ?? null,
        item.outcome ?? null,
        item.createdAt,
        item.updatedAt
      );

      return item;
    },

    update(id: string, input: ApplicationUpdateInput) {
      const currentRow = db
        .prepare(
          `
          SELECT *
          FROM applications
          WHERE id = ?
        `
        )
        .get(id) as ApplicationRow | undefined;
      const current = currentRow ? rowToApplication(currentRow) : undefined;

      if (!current) {
        return undefined;
      }

      const now = new Date().toISOString();
      const next = ApplicationSchema.parse({
        ...current,
        ...input,
        appliedAt:
          input.status === "applied" && !input.appliedAt
            ? (current.appliedAt ?? now)
            : (input.appliedAt ?? current.appliedAt),
        nextFollowUpAt:
          input.nextFollowUpAt === null
            ? undefined
            : (input.nextFollowUpAt ?? current.nextFollowUpAt),
        updatedAt: now
      });

      db.prepare(
        `
        UPDATE applications
        SET
          resume_version_id = ?,
          greeting_variant = ?,
          status = ?,
          greeting_message = ?,
          applied_at = ?,
          next_follow_up_at = ?,
          outcome = ?,
          updated_at = ?
        WHERE id = ?
      `
      ).run(
        next.resumeVersionId ?? null,
        next.greetingVariant,
        next.status,
        next.greetingMessage,
        next.appliedAt ?? null,
        next.nextFollowUpAt ?? null,
        next.outcome ?? null,
        next.updatedAt,
        next.id
      );

      if (current.status !== next.status) {
        insertApplicationEvent(db, {
          applicationId: next.id,
          type: "status_changed",
          content: JSON.stringify({
            from: current.status,
            to: next.status
          }),
          occurredAt: now
        });
      }

      return next;
    }
  };
}

function rowToApplication(row: ApplicationRow): Application {
  return ApplicationSchema.parse({
    id: row.id,
    jobId: row.job_id,
    resumeVersionId: row.resume_version_id ?? undefined,
    greetingVariant: row.greeting_variant,
    status: row.status,
    greetingMessage: row.greeting_message ?? "",
    appliedAt: row.applied_at ?? undefined,
    nextFollowUpAt: row.next_follow_up_at ?? undefined,
    outcome: row.outcome ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

function rowToApplicationEvent(row: ApplicationEventRow): ApplicationEvent {
  return ApplicationEventSchema.parse({
    id: row.id,
    applicationId: row.application_id,
    type: row.type,
    content: row.content ?? undefined,
    occurredAt: row.occurred_at
  });
}

function insertApplicationEvent(
  db: DatabaseSync,
  input: Omit<ApplicationEvent, "id"> & {
    id?: string;
  }
) {
  const item = ApplicationEventSchema.parse({
    id: input.id ?? crypto.randomUUID(),
    ...input
  });

  db.prepare(
    `
    INSERT INTO application_events (
      id,
      application_id,
      type,
      content,
      occurred_at
    )
    VALUES (?, ?, ?, ?, ?)
  `
  ).run(item.id, item.applicationId, item.type, item.content ?? null, item.occurredAt);

  return item;
}
