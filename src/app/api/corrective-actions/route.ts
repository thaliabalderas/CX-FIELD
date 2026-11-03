import { suggestCorrectiveActions } from "@/lib/ai/suggestions";
import { apiError, handleRoute } from "@/lib/apiResponse";
import { newItemId } from "@/lib/ids";
import { readSuggestionRequest } from "@/lib/suggestionRequest";
import type { SelectableItem } from "@/types";

/**
 * Step 3 suggestions: corrective actions, from the same observation text and
 * photos as Step 2 plus the diagnostic checks the engineer selected - including any they
 * typed in themselves - so the actions follow the engineer's judgement rather
 * than second-guessing it.
 */
export async function POST(request: Request) {
  return handleRoute("generate suggested corrective actions", async () => {
    const body: unknown = await request.json().catch(() => null);
    const suggestionRequest = readSuggestionRequest(body);

    if (!suggestionRequest) {
      return apiError(
        "Equipment and the field observation are both required.",
        400,
      );
    }
    if (
      !suggestionRequest.selectedCauses ||
      suggestionRequest.selectedCauses.length === 0
    ) {
      return apiError("Select at least one recommended diagnostic check first.", 400);
    }

    const actions: SelectableItem[] = (
      await suggestCorrectiveActions(suggestionRequest)
    ).map((text) => ({
      id: newItemId(),
      text,
      selected: false,
      isCustom: false,
    }));

    return Response.json({ actions });
  });
}
