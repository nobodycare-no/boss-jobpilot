export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiJsonRequest = {
  messages: AiMessage[];
  model?: string;
  temperature?: number;
};

export type AiProvider = {
  name: string;
  generateJson<T>(request: AiJsonRequest): Promise<T>;
};

export const promptVersions = {
  jdParser: "jd-parser@0.1.0",
  experienceMatcher: "experience-matcher@0.1.0",
  resumeWriter: "resume-writer@0.1.0",
  greetingWriter: "greeting-writer@0.1.0",
  interviewCoach: "interview-coach@0.1.0"
} as const;
