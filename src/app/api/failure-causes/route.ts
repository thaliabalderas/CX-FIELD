import { suggestFailureCauses } from "@/lib/ai/suggestions";
import { apiError, handleRoute } from "@/lib/apiResponse";
import { newItemId } from "@/lib/ids";
import { readSuggestionRequest } from "@/lib/suggestionRequest";
import type { SelectableItem } from "@/types";

/**
 * Step 2 suggestions: recommended diagnostic checks (stored and returned as `causes` for compatibility), from the observation text and
 * the photos. The model call lives in `src/lib/ai/suggestions.ts`; the browser
 * only ever talks to this route, so the OpenAI key never reaches client code.
 */
export async function POST(request: Request) {
  return handleRoute("generate recommended diagnostic checks", async () => {
    const body: unknown = await request.json().catch(() => null);
    const suggestionRequest = readSuggestionRequest(body);

    if (!suggestionRequest) {
      return apiError(
        "Equipment and the field observation are both required.",
        400,
      );
    }

    const causes: SelectableItem[] = (
      await suggestFailureCauses(suggestionRequest)
    ).map((text) => ({
      id: newItemId(),
      text,
      // Nothing is pre-selected: the engineer stays in control of every
      // item that reaches the report.
      selected: false,
      isCustom: false,
    }));

    return Response.json({ causes });
  });
}
