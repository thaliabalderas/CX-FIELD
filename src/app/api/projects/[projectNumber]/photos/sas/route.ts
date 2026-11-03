import { PHOTO_URL_CACHE_SECONDS, photoReadUrl } from "@/lib/azure/blob";
import { apiError, handleRoute } from "@/lib/apiResponse";
import { isValidProjectNumber } from "@/lib/validation";
import { getProject } from "@/repositories/projectRepository";

/**
 * Mints short-lived read URLs for field photos.
 *
 * Accepts a batch of blob paths so a report with several photos costs one
 * request instead of one per image.
 */

const MAX_PATHS_PER_REQUEST = 40;

/**
 * A requested path must sit inside the project folder named in the URL.
 * Without this check the endpoint would sign any path in the container, making
 * it a read-anything oracle over every project's photos.
 */
function isPathInProject(path: string, projectNumber: string): boolean {
  return (
    path.startsWith(`${projectNumber}/`) &&
    // Reject traversal and any attempt to escape the prefix.
    !path.includes("..") &&
    !path.includes("//") &&
    path.endsWith(".jpg")
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectNumber: string }> },
) {
  return handleRoute("prepare the photo links", async () => {
    const { projectNumber } = await params;

    if (!isValidProjectNumber(projectNumber)) {
      return apiError("Invalid project number.", 400);
    }

    if (!(await getProject(projectNumber))) {
      return apiError(`Project ${projectNumber} was not found.`, 404);
    }

    const body: unknown = await request.json().catch(() => null);
    const paths =
      typeof body === "object" && body !== null
        ? (body as { blobPaths?: unknown }).blobPaths
        : null;

    if (!Array.isArray(paths) || paths.some((p) => typeof p !== "string")) {
      return apiError("Expected a `blobPaths` array of strings.", 400);
    }
    if (paths.length > MAX_PATHS_PER_REQUEST) {
      return apiError(
        `Too many photos requested at once (limit ${MAX_PATHS_PER_REQUEST}).`,
        400,
      );
    }
    if ((paths as string[]).some((path) => !isPathInProject(path, projectNumber))) {
      return apiError("A requested photo does not belong to this project.", 403);
    }

    const entries = await Promise.all(
      (paths as string[]).map(
        async (blobPath) => [blobPath, await photoReadUrl(blobPath)] as const,
      ),
    );

    return Response.json(
      { urls: Object.fromEntries(entries) },
      {
        headers: {
          // Below the SAS lifetime, so a cached response can never hand out an
          // already-expired URL.
          "Cache-Control": `private, max-age=${PHOTO_URL_CACHE_SECONDS}`,
        },
      },
    );
  });
}
