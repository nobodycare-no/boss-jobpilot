import { pathToFileURL } from "node:url";

import Fastify from "fastify";

import { computeJobMatchScore } from "@boss-jobpilot/scoring";
import { JobPostingSchema } from "@boss-jobpilot/shared";

export function buildServer() {
  const server = Fastify({
    logger: true
  });

  server.get("/health", async () => ({
    ok: true,
    service: "boss-jobpilot-api",
    version: "0.1.0"
  }));

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
  const server = buildServer();

  await server.listen({ host, port });
}

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;

if (import.meta.url === entrypoint) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
