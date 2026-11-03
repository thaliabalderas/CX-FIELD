import "server-only";

import { downloadPhoto } from "@/lib/azure/blob";
import { env } from "@/lib/env";
import type { SuggestionRequest } from "@/types";

/**
 * Diagnostic-check and corrective-action suggestions from OpenAI. (The checks
 * are still stored and exchanged as `causes`, so existing data and the API
 * contract are unchanged.)
 *
 * Called only from the two suggestion route handlers. The key is read from
 * `process.env` on the server and never leaves it. Photos are read from Blob
 * Storage here and sent inline, so no link to a private photo is ever given
 * to a third party.
 *
 * Plain `fetch` against the Chat Completions API rather than an SDK: two calls
 * do not justify a dependency. The response is constrained to a JSON schema,
 * so the output is always a list of strings rather than prose to be parsed.
 */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

/** Long enough for a vision request on a slow day, short enough that an
 *  engineer on site is not left watching a spinner indefinitely. */
const TIMEOUT_MS = 60_000;

const ROLE = `You are a senior building commissioning (Cx) engineer reviewing a field observation made during commissioning of building systems (HVAC, controls, plumbing, electrical, life safety).`;

const STYLE = `Each item is a single, specific sentence an engineer could act on. No numbering, no headings, no preamble. Use the photos only where they show something relevant; never describe something that is not visible or stated.`;

export async function suggestFailureCauses(
  request: SuggestionRequest,
): Promise<string[]> {
  return suggestList(
    `${ROLE}

List 5 to 8 recommended diagnostic checks for what was found: specific troubleshooting steps the engineer can carry out on site to narrow down why it happened, most useful first. Each check starts with a verb such as Verify, Confirm, Inspect, Measure or Compare, says what to check and, where practical, what result would indicate a problem. These are checks to perform, not conclusions: never state or imply that any of them is the established cause, and do not assume a fault the observation does not describe. ${STYLE}`,
    observationText(request),
    request.photoPaths,
  );
}

export async function suggestCorrectiveActions(
  request: SuggestionRequest,
): Promise<string[]> {
  const causes = (request.selectedCauses ?? [])
    .map((cause, index) => `${index + 1}. ${cause}`)
    .join("\n");

  return suggestList(
    `${ROLE}

The engineer has selected the diagnostic checks below as the ones they will carry out. List 5 to 8 corrective actions that follow from those checks - and only those checks - most important first. Phrase an action conditionally where it depends on a check confirming a problem (for example "If the actuator linkage is slipping, re-seat and recalibrate it"), rather than presenting a cause as established. Where the responsible party is clear (for example the controls contractor or the balancing contractor), name it. ${STYLE}`,
    `${observationText(request)}

Diagnostic checks selected by the engineer:
${causes}`,
    request.photoPaths,
  );
}

/** The Step 1 fields, labelled as they appear on the form. Blank optional
 *  fields are left out rather than sent as empty lines. */
function observationText(request: SuggestionRequest): string {
  const fields: [string, string][] = [
    ["Equipment", request.equipment],
    ["System", request.system],
    ["Location", request.location],
    ["Activity / Test", request.activity],
  ];

  return `${fields
    .filter(([, value]) => value.trim().length > 0)
    .map(([label, value]) => `${label}: ${value.trim()}`)
    .join("\n")}

Observation / what was found:
${request.observation.trim()}`;
}

type ChatCompletion = {
  choices?: { message?: { content?: string | null; refusal?: string | null } }[];
};

async function suggestList(
  instructions: string,
  text: string,
  photoPaths: string[],
): Promise<string[]> {
  const images = await Promise.all(
    photoPaths.map(async (path) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:image/jpeg;base64,${(await downloadPhoto(path)).toString("base64")}`,
      },
    })),
  );

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.openaiModel,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: [{ type: "text", text }, ...images] },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "suggestions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              suggestions: { type: "array", items: { type: "string" } },
            },
            required: ["suggestions"],
            additionalProperties: false,
          },
        },
      },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    // The body names the problem (bad key, unknown model, quota) and goes to
    // the server log via handleRoute; the browser gets the generic message.
    throw new Error(
      `OpenAI request failed (${response.status}): ${(await response.text()).slice(0, 500)}`,
    );
  }

  const completion = (await response.json()) as ChatCompletion;
  const message = completion.choices?.[0]?.message;
  if (message?.refusal) {
    throw new Error(`OpenAI declined the request: ${message.refusal}`);
  }

  const parsed = JSON.parse(message?.content ?? "{}") as {
    suggestions?: unknown;
  };
  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : [];

  if (suggestions.length === 0) {
    throw new Error("OpenAI returned no suggestions.");
  }
  return suggestions;
}
