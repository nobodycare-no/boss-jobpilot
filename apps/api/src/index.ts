import type { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";

import Fastify from "fastify";

import {
  createExperienceRepository,
  createJobAnalysisRepository,
  createJobRepository,
  createResumeVersionRepository,
  openJobpilotDatabase
} from "@boss-jobpilot/db";
import { generateTailoredResumeDraft, renderResumeMarkdown } from "@boss-jobpilot/resume";
import { analyzeJobPosting, computeJobMatchScore } from "@boss-jobpilot/scoring";
import {
  ExperienceItemCreateSchema,
  ExperienceItemUpdateSchema,
  JobPostingCreateSchema,
  JobPostingSchema,
  JobPostingUpdateSchema,
  type CandidatePreference
} from "@boss-jobpilot/shared";

type BuildServerOptions = {
  database?: DatabaseSync;
  databasePath?: string;
};

const defaultCandidatePreference: CandidatePreference = {
  targetRoles: ["AI 应用开发", "前端开发", "全栈开发"],
  targetCities: [],
  preferredKeywords: ["React", "TypeScript", "AI", "Node.js"],
  blockedKeywords: ["外包", "驻场", "培训"]
};

export function buildServer(options: BuildServerOptions = {}) {
  const database = options.database ?? openJobpilotDatabase(options.databasePath);
  const experiences = createExperienceRepository(database);
  const jobs = createJobRepository(database);
  const jobAnalyses = createJobAnalysisRepository(database);
  const resumeVersions = createResumeVersionRepository(database);
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

  server.get("/jobs", async () => ({
    items: jobs.list()
  }));

  server.get<{ Params: { id: string } }>("/jobs/:id", async (request, reply) => {
    const item = jobs.get(request.params.id);

    if (!item) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    return {
      item
    };
  });

  server.post("/jobs", async (request, reply) => {
    const parsedJob = JobPostingCreateSchema.safeParse(request.body);

    if (!parsedJob.success) {
      return reply.status(400).send({
        error: "INVALID_JOB_POSTING",
        details: parsedJob.error.flatten()
      });
    }

    const item = jobs.create(parsedJob.data);

    return reply.status(201).send({
      item
    });
  });

  server.put<{ Params: { id: string } }>("/jobs/:id", async (request, reply) => {
    const parsedJob = JobPostingUpdateSchema.safeParse(request.body);

    if (!parsedJob.success) {
      return reply.status(400).send({
        error: "INVALID_JOB_POSTING",
        details: parsedJob.error.flatten()
      });
    }

    const item = jobs.update(request.params.id, parsedJob.data);

    if (!item) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    return {
      item
    };
  });

  server.delete<{ Params: { id: string } }>("/jobs/:id", async (request, reply) => {
    const deleted = jobs.delete(request.params.id);

    if (!deleted) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    return reply.status(204).send();
  });

  server.post<{ Params: { id: string } }>("/jobs/:id/analyze", async (request, reply) => {
    const job = jobs.get(request.params.id);

    if (!job) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    const analysis = jobAnalyses.create(
      analyzeJobPosting(job, defaultCandidatePreference, experiences.list())
    );

    return {
      jobId: job.id,
      analysis,
      score: analysisToLegacyScore(analysis)
    };
  });

  server.get<{ Params: { id: string } }>("/jobs/:id/analyses", async (request, reply) => {
    const job = jobs.get(request.params.id);

    if (!job) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    return {
      items: jobAnalyses.listByJobId(job.id)
    };
  });

  server.get<{ Params: { id: string } }>("/jobs/:id/analysis/latest", async (request, reply) => {
    const job = jobs.get(request.params.id);

    if (!job) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    return {
      item: jobAnalyses.getLatestByJobId(job.id) ?? null
    };
  });

  server.post("/jobs/analyze", async (request, reply) => {
    const parsedJob = JobPostingSchema.safeParse(request.body);

    if (!parsedJob.success) {
      return reply.status(400).send({
        error: "INVALID_JOB_POSTING",
        details: parsedJob.error.flatten()
      });
    }

    const score = computeJobMatchScore(parsedJob.data, defaultCandidatePreference);
    const analysis = analyzeJobPosting(
      parsedJob.data,
      defaultCandidatePreference,
      experiences.list()
    );

    return {
      jobId: parsedJob.data.id,
      analysis,
      score
    };
  });

  server.post<{ Params: { id: string } }>("/jobs/:id/resumes", async (request, reply) => {
    const job = jobs.get(request.params.id);

    if (!job) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    const analysis = jobAnalyses.getLatestByJobId(job.id);

    if (!analysis) {
      return reply.status(409).send({
        error: "ANALYSIS_REQUIRED"
      });
    }

    const draft = generateTailoredResumeDraft({
      job,
      analysis,
      experiences: experiences.list()
    });
    const item = resumeVersions.create({
      jobId: job.id,
      variant: "tailored",
      markdownContent: renderResumeMarkdown(draft),
      selectedExperienceIds: draft.experiences.map((experience) => experience.id),
      changeSummary: draft.changeSummary
    });

    return reply.status(201).send({
      item
    });
  });

  server.get<{ Params: { id: string } }>("/jobs/:id/resumes", async (request, reply) => {
    const job = jobs.get(request.params.id);

    if (!job) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    return {
      items: resumeVersions.listByJobId(job.id)
    };
  });

  server.get<{ Params: { id: string } }>("/jobs/:id/resume/latest", async (request, reply) => {
    const job = jobs.get(request.params.id);

    if (!job) {
      return reply.status(404).send({
        error: "JOB_NOT_FOUND"
      });
    }

    return {
      item: resumeVersions.getLatestByJobId(job.id) ?? null
    };
  });

  return server;
}

function analysisToLegacyScore(analysis: {
  matchScore: number;
  recommendation: "prioritize" | "apply" | "cautious" | "skip";
  matchedKeywords: string[];
  riskFlags: string[];
}) {
  return {
    total: analysis.matchScore,
    recommendation: analysis.recommendation,
    matchedKeywords: analysis.matchedKeywords,
    riskFlags: analysis.riskFlags
  };
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
