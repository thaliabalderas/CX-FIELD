import type { ObservationForm, SaveObservationInput } from "@/types";

/**
 * A project number is simultaneously a Cosmos document id, a Cosmos partition
 * key and a blob path segment. Validating it in exactly one place - at the
 * edge, before it can reach either store - is what keeps those three uses
 * consistent.
 *
 * Excludes the characters Cosmos forbids in ids (`/ \ ? #`) along with
 * whitespace and anything awkward inside a blob path.
 */
export const PROJECT_NUMBER_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,62}[A-Za-z0-9])?$/;

export function isValidProjectNumber(value: unknown): value is string {
  return typeof value === "string" && PROJECT_NUMBER_PATTERN.test(value);
}

export const PROJECT_NUMBER_HINT =
  "Use letters, numbers, dots, dashes or underscores (for example 24-1057).";

/** Ids we generate ourselves; also used to keep blob paths well formed. */
const GENERATED_ID_PATTERN = /^[A-Za-z0-9_]{1,64}$/;

export function isValidGeneratedId(value: unknown): value is string {
  return typeof value === "string" && GENERATED_ID_PATTERN.test(value);
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Fields the engineer must fill in before leaving Step 1. */
export const REQUIRED_OBSERVATION_FIELDS = [
  "equipment",
  "system",
  "activity",
  "observation",
] as const satisfies readonly (keyof ObservationForm)[];

export const OBSERVATION_FIELD_LABELS: Record<keyof ObservationForm, string> = {
  equipment: "Equipment",
  system: "System",
  location: "Location",
  activity: "Activity / Test",
  observation: "Observation / What Was Found",
  observedDate: "Date",
};

/**
 * Which required Step 1 fields are still blank. Shared by the form (to render
 * inline errors) and by the step guards (to decide whether a later step is
 * reachable), so the two can never disagree about what "complete" means.
 */
export function missingObservationFields(
  form: ObservationForm,
): (keyof ObservationForm)[] {
  return REQUIRED_OBSERVATION_FIELDS.filter(
    (field) => form[field].trim().length === 0,
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecordedItemArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        isValidGeneratedId((item as { id?: unknown }).id) &&
        isNonEmptyString((item as { text?: unknown }).text) &&
        typeof (item as { isCustom?: unknown }).isCustom === "boolean",
    )
  );
}

function isPhotoArray(value: unknown, projectNumber: string): boolean {
  return (
    Array.isArray(value) &&
    value.every((photo) => {
      if (typeof photo !== "object" || photo === null) return false;
      const { id, blobPath, fileName } = photo as Record<string, unknown>;
      return (
        isValidGeneratedId(id) &&
        typeof blobPath === "string" &&
        // A photo may only ever reference a blob inside its own project folder.
        blobPath.startsWith(`${projectNumber}/`) &&
        isNonEmptyString(fileName)
      );
    })
  );
}

/**
 * Validates the Step 4 save payload. Returns `null` when valid, otherwise a
 * message suitable for a 400 response.
 */
export function validateSaveObservation(
  body: unknown,
  projectNumber: string,
): string | null {
  if (typeof body !== "object" || body === null) {
    return "Request body must be an object.";
  }

  const input = body as Partial<SaveObservationInput>;

  if (!isValidGeneratedId(input.id)) {
    return "Invalid observation id.";
  }
  for (const field of REQUIRED_OBSERVATION_FIELDS) {
    if (!isNonEmptyString(input[field])) {
      return `${OBSERVATION_FIELD_LABELS[field]} is required.`;
    }
  }
  if (typeof input.location !== "string") {
    return "Location must be a string.";
  }
  if (!isNonEmptyString(input.observedDate) || !ISO_DATE_PATTERN.test(input.observedDate)) {
    return "Date must be in yyyy-mm-dd format.";
  }
  if (!isPhotoArray(input.photos, projectNumber)) {
    return "One or more photos are invalid.";
  }
  if (!isRecordedItemArray(input.causes)) {
    return "One or more recommended diagnostic checks are invalid.";
  }
  if (!isRecordedItemArray(input.actions)) {
    return "One or more suggested corrective actions are invalid.";
  }
  if (input.causes!.length === 0) {
    return "Select at least one recommended diagnostic check.";
  }
  if (input.actions!.length === 0) {
    return "Select at least one suggested corrective action.";
  }

  return null;
}
