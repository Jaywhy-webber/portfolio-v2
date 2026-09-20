import type { PipelineStep } from "./steps";

export const workflowIntro =
  "A structured agentic coding loop: a coding agent runs autonomously through a defined pipeline while I keep oversight of architecture decisions and testing.";

export const workflowRepoUrl = "https://github.com/Jaywhy-webber/portfolio";

export const workflowSteps: PipelineStep[] = [
  {
    label: "Ideation",
    description:
      "Define the app or feature at a high level by establishing what problem it solves and why it's worth building",
  },
  {
    label: "Research",
    description:
      "For complex explore phases, produce a `research.md` that caches findings so the agent doesn't re-derive them",
  },
  {
    label: "Prototype",
    description:
      "Present ideas in code to get early feedback; the prototype's assets feed directly into implementation",
  },
  {
    label: "PRD",
    description:
      "Write a markdown file describing the destination: user stories, acceptance criteria, and implementation notes",
  },
  {
    label: "Kanban",
    description:
      "Break the PRD into individual tickets with explicit blocking relationships, establishing the agent's work queue",
  },
  {
    label: "Implementation",
    description:
      "A coding agent runs in a loop, executing tickets sequentially and opening pull requests automatically",
  },
  {
    label: "QA / Review",
    description:
      "The agent produces a QA plan; a human verifies the work before the branch is merged",
  },
];
