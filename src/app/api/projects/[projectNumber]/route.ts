import { apiError, handleRoute } from "@/lib/apiResponse";
import { currentUser } from "@/lib/currentUser";
import { isValidProjectNumber } from "@/lib/validation";
import {
  getProject,
  isProjectCreator,
  ProjectConflictError,
  ProjectForbiddenError,
  ProjectNotFoundError,
  renameProject,
  softDeleteProject,
} from "@/repositories/projectRepository";

type RouteContext = { params: Promise<{ projectNumber: string }> };

/** Maps the repository's expected failures onto HTTP statuses. */
function repositoryErrorResponse(error: unknown): Response | null {
  if (error instanceof ProjectNotFoundError) return apiError(error.message, 404);
  if (error instanceof ProjectForbiddenError) return apiError(error.message, 403);
  if (error instanceof ProjectConflictError) return apiError(error.message, 409);
  return null;
}

export async function GET(_request: Request, { params }: RouteContext) {
  return handleRoute("load the project", async () => {
    const { projectNumber } = await params;

    if (!isValidProjectNumber(projectNumber)) {
      return apiError("Invalid project number.", 400);
    }

    const project = await getProject(projectNumber);
    if (!project) {
      return apiError(`Project ${projectNumber} was not found.`, 404);
    }

    return Response.json({
      project: {
        ...project,
        canManage: isProjectCreator(project, await currentUser()),
      },
    });
  });
}

/** Renames a project. Only `name` can change. Creator only. */
export async function PATCH(request: Request, { params }: RouteContext) {
  return handleRoute("rename the project", async () => {
    const { projectNumber } = await params;

    if (!isValidProjectNumber(projectNumber)) {
      return apiError("Invalid project number.", 400);
    }

    const body: unknown = await request.json().catch(() => null);
    const name =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>).name
        : undefined;
    if (typeof name !== "string" || name.trim().length === 0) {
      return apiError("Project name is required.", 400);
    }
    if (name.trim().length > 200) {
      return apiError("Project name must be 200 characters or fewer.", 400);
    }

    try {
      const project = await renameProject(projectNumber, name.trim());
      return Response.json({
        project: { ...project, canManage: true },
      });
    } catch (error) {
      const response = repositoryErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}

/**
 * Deletes a project - softly. The project is hidden and its observations and
 * photos are left exactly as they are. The caller must echo the project
 * number back, so a stray request cannot delete anything. Creator only.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  return handleRoute("delete the project", async () => {
    const { projectNumber } = await params;

    if (!isValidProjectNumber(projectNumber)) {
      return apiError("Invalid project number.", 400);
    }

    const body: unknown = await request.json().catch(() => null);
    const confirm =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>).confirmProjectNumber
        : undefined;
    if (confirm !== projectNumber) {
      return apiError(
        "Confirm the deletion by sending the project number.",
        400,
      );
    }

    try {
      await softDeleteProject(projectNumber);
      return Response.json({ deleted: true });
    } catch (error) {
      const response = repositoryErrorResponse(error);
      if (response) return response;
      throw error;
    }
  });
}
