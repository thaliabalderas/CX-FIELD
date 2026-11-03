import { apiError, handleRoute } from "@/lib/apiResponse";
import { buildDeficiencyLog } from "@/lib/export/deficiencyLog";
import { isValidProjectNumber } from "@/lib/validation";
import { listObservations } from "@/repositories/observationRepository";
import { getProject } from "@/repositories/projectRepository";

/**
 * Excel export of a project's observations in the Parkhill commissioning
 * deficiency log layout. Read-only. PDF export is the browser's print path and
 * does not go through here.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectNumber: string }> },
) {
  return handleRoute("export the report", async () => {
    const { projectNumber } = await params;

    if (!isValidProjectNumber(projectNumber)) {
      return apiError("Invalid project number.", 400);
    }

    const project = await getProject(projectNumber);
    if (!project) {
      return apiError(`Project ${projectNumber} was not found.`, 404);
    }

    const observations = await listObservations(projectNumber);
    if (observations.length === 0) {
      return apiError("This project has no observations to export.", 404);
    }

    const file = await buildDeficiencyLog(project, observations);
    const date = new Date().toISOString().slice(0, 10);
    // The project number is already restricted to [A-Za-z0-9._-].
    const fileName = `${projectNumber}_Deficiency_Log_${date}.xlsx`;

    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
