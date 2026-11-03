import { apiError, handleRoute } from "@/lib/apiResponse";
import { isValidProjectNumber, validateSaveObservation } from "@/lib/validation";
import {
  listObservations,
  saveObservation,
} from "@/repositories/observationRepository";
import { getProject } from "@/repositories/projectRepository";
import type { SaveObservationInput } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectNumber: string }> },
) {
  return handleRoute("load the observations", async () => {
    const { projectNumber } = await params;

    if (!isValidProjectNumber(projectNumber)) {
      return apiError("Invalid project number.", 400);
    }

    if (!(await getProject(projectNumber))) {
      return apiError(`Project ${projectNumber} was not found.`, 404);
    }

    const observations = await listObservations(projectNumber);
    return Response.json({ observations });
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectNumber: string }> },
) {
  return handleRoute("save the observation", async () => {
    const { projectNumber } = await params;

    if (!isValidProjectNumber(projectNumber)) {
      return apiError("Invalid project number.", 400);
    }

    // An observation may only be filed against a project that exists - this is
    // the server-side half of the "create a project first" rule.
    if (!(await getProject(projectNumber))) {
      return apiError(`Project ${projectNumber} was not found.`, 404);
    }

    const body: unknown = await request.json().catch(() => null);
    const problem = validateSaveObservation(body, projectNumber);
    if (problem) {
      return apiError(problem, 400);
    }

    const observation = await saveObservation(
      projectNumber,
      body as SaveObservationInput,
    );
    return Response.json({ observation }, { status: 201 });
  });
}
