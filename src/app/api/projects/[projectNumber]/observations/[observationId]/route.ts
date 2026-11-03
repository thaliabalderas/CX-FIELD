import { apiError, handleRoute } from "@/lib/apiResponse";
import {
  isValidGeneratedId,
  isValidProjectNumber,
  validateSaveObservation,
} from "@/lib/validation";
import {
  getObservation,
  updateObservation,
} from "@/repositories/observationRepository";
import { getProject } from "@/repositories/projectRepository";
import type { SaveObservationInput } from "@/types";

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ projectNumber: string; observationId: string }> },
) {
  return handleRoute("load the observation", async () => {
    const { projectNumber, observationId } = await params;

    if (!isValidProjectNumber(projectNumber)) {
      return apiError("Invalid project number.", 400);
    }
    if (!isValidGeneratedId(observationId)) {
      return apiError("Invalid observation id.", 400);
    }

    if (!(await getProject(projectNumber))) {
      return apiError(`Project ${projectNumber} was not found.`, 404);
    }

    const observation = await getObservation(projectNumber, observationId);
    if (!observation) {
      return apiError("Observation was not found.", 404);
    }

    return Response.json({ observation });
  });
}

/** Saves edits to an existing observation. Validated exactly like a new one. */
export async function PUT(
  request: Request,
  {
    params,
  }: { params: Promise<{ projectNumber: string; observationId: string }> },
) {
  return handleRoute("save the observation", async () => {
    const { projectNumber, observationId } = await params;

    if (!isValidProjectNumber(projectNumber)) {
      return apiError("Invalid project number.", 400);
    }
    if (!isValidGeneratedId(observationId)) {
      return apiError("Invalid observation id.", 400);
    }

    if (!(await getProject(projectNumber))) {
      return apiError(`Project ${projectNumber} was not found.`, 404);
    }

    const body: unknown = await request.json().catch(() => null);
    const problem = validateSaveObservation(body, projectNumber);
    if (problem) {
      return apiError(problem, 400);
    }

    const input = body as SaveObservationInput;
    if (input.id !== observationId) {
      return apiError("Observation id does not match the URL.", 400);
    }

    const observation = await updateObservation(projectNumber, input);
    if (!observation) {
      return apiError("Observation was not found.", 404);
    }

    return Response.json({ observation });
  });
}
