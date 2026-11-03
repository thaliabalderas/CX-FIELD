/**
 * The four workflow steps, defined once.
 *
 * Each step is a real route rather than an index held in component state.
 * On a phone the browser back gesture is the primary way people navigate, and
 * with a step counter "back" leaves the app and destroys the engineer's field
 * notes. With routes it walks the wizard, and the draft survives because the
 * React context lives in the wizard layout, which client-side navigation does
 * not remount.
 *
 * This module is shared by the step indicator (to render progress), the step
 * guards (to decide what is reachable) and the pages themselves (to navigate),
 * so those three can never disagree about the order of the workflow.
 */

export const WORKFLOW_STEPS = [
  { slug: "observation", title: "Observation", label: "Field Observation" },
  { slug: "causes", title: "Checks", label: "Recommended Diagnostic Checks" },
  { slug: "actions", title: "Actions", label: "Suggested Corrective Actions" },
  { slug: "report", title: "Report", label: "Report Preview" },
] as const;

export type WorkflowStepSlug = (typeof WORKFLOW_STEPS)[number]["slug"];

export function wizardPath(
  projectNumber: string,
  slug: WorkflowStepSlug,
): string {
  return `/projects/${encodeURIComponent(projectNumber)}/observations/new/${slug}`;
}

export function stepIndex(slug: WorkflowStepSlug): number {
  return WORKFLOW_STEPS.findIndex((step) => step.slug === slug);
}
