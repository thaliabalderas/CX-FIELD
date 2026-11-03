import { apiError, handleRoute } from "@/lib/apiResponse";
import { currentUser } from "@/lib/currentUser";
import { isValidProjectNumber, PROJECT_NUMBER_HINT } from "@/lib/validation";
import {
  createProject,
  isProjectCreator,
  listProjects,
  ProjectAlreadyExistsError,
} from "@/repositories/projectRepository";

export async function GET() {
  return handleRoute("load projects", async () => {
    const [projects, user] = await Promise.all([listProjects(), currentUser()]);
    return Response.json({
      projects: projects.map((project) => ({
        ...project,
        canManage: isProjectCreator(project, user),
      })),
    });
  });
}

export async function POST(request: Request) {
  return handleRoute("create the project", async () => {
    const body: unknown = await request.json().catch(() => null);
    if (typeof body !== "object" || body === null) {
      return apiError("Request body must be an object.", 400);
    }

    const { projectNumber, name } = body as Record<string, unknown>;

    if (!isValidProjectNumber(projectNumber)) {
      return apiError(`Invalid project number. ${PROJECT_NUMBER_HINT}`, 400);
    }
    if (typeof name !== "string" || name.trim().length === 0) {
      return apiError("Project name is required.", 400);
    }

    try {
      const project = await createProject({
        projectNumber,
        name: name.trim(),
      });
      return Response.json(
        { project: { ...project, canManage: true } },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof ProjectAlreadyExistsError) {
        return apiError(error.message, 409);
      }
      throw error;
    }
  });
}
