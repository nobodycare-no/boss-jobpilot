import { pathToFileURL } from "node:url";
import type { DatabaseSync } from "node:sqlite";

import Fastify from "fastify";

import { createExperienceRepository, openJobpilotDatabase } from "@boss-jobpilot/db";
import { computeJobMatchScore } from "@boss-jobpilot/scoring";
import {
  ExperienceItemCreateSchema,
  ExperienceItemUpdateSchema,
  JobPostingSchema
} from "@boss-jobpilot/shared";

type BuildServerOptions = {
  database?: DatabaseSync;
  databasePath?: string;
};

export function buildServer(options: BuildServerOptions = {}) {
  const database = options.database ?? openJobpilotDatabase(options.databasePath);
  const experiences = createExperienceRepository(database);
  const server = Fastify({
    logger: true
  });

  server.addHook("onRequest", async (request, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type");

    if (request.method === "OPTIONS") {
      return reply.status(204).send();
    }
  });

  server.get("/health", async () => ({
    ok: true,
    service: "boss-jobpilot-api",
    version: "0.1.0"
  }));

  server.get("/experiences", async () => ({
    items: experiences.list()
  }));

  server.get<{ Params: { id: string } }>("/experiences/:id", async (request, reply) => {
    const item = experiences.get(request.params.id);

    if (!item) {
      return reply.status(404).send({
        error: "EXPERIENCE_NOT_FOUND"
      });
    }

    return {
      item
    };
  });

  server.post("/experiences", async (request, reply) => {
    const parsedExperience = ExperienceItemCreateSchema.safeParse(request.body);

    if (!parsedExperience.success) {
      return reply.status(400).send({
        error: "INVALID_EXPERIENCE",
        details: parsedExperience.error.flatten()
      });
    }

    const item = experiences.create(parsedExperience.data);

    return reply.status(201).send({
      item
    });
  });

  server.put<{ Params: { id: string } }>("/experiences/:id", async (request, reply) => {
    const parsedExperience = ExperienceItemUpdateSchema.safeParse(request.body);

    if (!parsedExperience.success) {
      return reply.status(400).send({
        error: "INVALID_EXPERIENCE",
        details: parsedExperience.error.flatten()
      });
    }

    const item = experiences.update(request.params.id, parsedExperience.data);

    if (!item) {
      return reply.status(404).send({
        error: "EXPERIENCE_NOT_FOUND"
      });
    }

    return {
      item
    };
  });

  server.delete<{ Params: { id: string } }>("/experiences/:id", async (request, reply) => {
    const deleted = experiences.delete(request.params.id);

    if (!deleted) {
      return reply.status(404).send({
        error: "EXPERIENCE_NOT_FOUND"
      });
    }

    return reply.status(204).send();
  });

  server.post("/jobs/analyze", async (request, reply) => {
    const parsedJob = JobPostingSchema.safeParse(request.body);

    if (!parsedJob.success) {
      return reply.status(400).send({
        error: "INVALID_JOB_POSTING",
        details: parsedJob.error.flatten()
      });
    }

    const score = computeJobMatchScore(parsedJob.data, {
      targetRoles: ["AI 应用开发", "前端开发", "全栈开发"],
      targetCities: [],
      preferredKeywords: ["React", "TypeScript", "AI", "Node.js"],
      blockedKeywords: ["外包", "驻场", "培训"]
    });

    return {
      jobId: parsedJob.data.id,
      score
    };
  });

  return server;
}

async function main() {
  const host = process.env.API_HOST ?? "127.0.0.1";
  const port = Number(process.env.API_PORT ?? 4000);
  const server = buildServer({
    databasePath: process.env.DATABASE_PATH
  });

  await server.listen({ host, port });
}

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;

if (import.meta.url === entrypoint) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
