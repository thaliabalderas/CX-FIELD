"use client";

import { Button, Input, Stack, Textarea } from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { LuRotateCcw, LuSparkles } from "react-icons/lu";

import { FormField } from "@/components/FormField";
import { NavigationButtons } from "@/components/NavigationButtons";
import { PhotoUpload } from "@/components/PhotoUpload";
import { WizardShell } from "@/components/WizardShell";
import { notifyError } from "@/components/ui/toaster";
import { useObservationDraft } from "@/context/ObservationDraftContext";
import {
  missingObservationFields,
  OBSERVATION_FIELD_LABELS,
} from "@/lib/validation";
import { wizardPath } from "@/lib/workflowSteps";
import { fetchFailureCauses } from "@/services/aiService";
import type { ObservationForm } from "@/types";

/** Step 1 - the field observation itself. */
export default function ObservationStepPage() {
  const params = useParams<{ projectNumber: string }>();
  const projectNumber = decodeURIComponent(params.projectNumber);
  const router = useRouter();

  const { draft, hydrated, setField, addPhoto, removePhoto, setCauses, reset } =
    useObservationDraft();

  const [generating, setGenerating] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const missing = missingObservationFields(draft.form);

  /** Only surfaces a field error once the engineer has tried to continue -
   *  flagging empty fields on a form they have not filled in yet is noise. */
  function errorFor(field: keyof ObservationForm): string | undefined {
    if (!showErrors || !missing.includes(field)) return undefined;
    return `${OBSERVATION_FIELD_LABELS[field]} is required.`;
  }

  async function generateCauses() {
    if (missing.length > 0) {
      setShowErrors(true);
      return;
    }

    setGenerating(true);
    try {
      const causes = await fetchFailureCauses(
        projectNumber,
        draft.form,
        draft.photos,
      );
      setCauses(causes);
      router.push(wizardPath(projectNumber, "causes"));
    } catch (error) {
      notifyError("Could not generate recommended diagnostic checks", error);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <WizardShell
      projectNumber={projectNumber}
      step="observation"
      description="Record what was found in the field. This becomes the observation on the report."
    >
      <Stack gap={{ base: 5, md: 6 }}>
        <Stack
          direction={{ base: "column", md: "row" }}
          gap={{ base: 5, md: 4 }}
        >
          <FormField
            label={OBSERVATION_FIELD_LABELS.equipment}
            required
            error={errorFor("equipment")}
          >
            <Input
              value={draft.form.equipment}
              onChange={(event) => setField("equipment", event.target.value)}
              placeholder="AHU-3"
              autoComplete="off"
            />
          </FormField>

          <FormField
            label={OBSERVATION_FIELD_LABELS.system}
            required
            error={errorFor("system")}
          >
            <Input
              value={draft.form.system}
              onChange={(event) => setField("system", event.target.value)}
              placeholder="Air handling"
              autoComplete="off"
            />
          </FormField>
        </Stack>

        <Stack
          direction={{ base: "column", md: "row" }}
          gap={{ base: 5, md: 4 }}
        >
          <FormField label={OBSERVATION_FIELD_LABELS.location}>
            <Input
              value={draft.form.location}
              onChange={(event) => setField("location", event.target.value)}
              placeholder="Penthouse mechanical room 2"
              autoComplete="off"
            />
          </FormField>

          <FormField label={OBSERVATION_FIELD_LABELS.observedDate} required>
            <Input
              type="date"
              value={draft.form.observedDate}
              onChange={(event) => setField("observedDate", event.target.value)}
            />
          </FormField>
        </Stack>

        <FormField
          label={OBSERVATION_FIELD_LABELS.activity}
          required
          helperText="The test or activity underway when the observation was made."
          error={errorFor("activity")}
        >
          <Input
            value={draft.form.activity}
            onChange={(event) => setField("activity", event.target.value)}
            placeholder="Functional performance test"
            autoComplete="off"
          />
        </FormField>

        <FormField
          label={OBSERVATION_FIELD_LABELS.observation}
          required
          helperText="Describe what was observed. Detail here is what makes the report useful later."
          error={errorFor("observation")}
        >
          <Textarea
            value={draft.form.observation}
            onChange={(event) => setField("observation", event.target.value)}
            placeholder="Supply fan ramps to full speed and holds there regardless of the duct static pressure setpoint…"
            // Generous on desktop, and autoresizing so a long field note on a
            // phone grows the box instead of scrolling inside a small one.
            rows={6}
            autoresize
          />
        </FormField>

        <FormField
          label="Field photos"
          helperText="Optional. Photos appear in the report, and are resized on this device before uploading."
        >
          <PhotoUpload
            projectNumber={projectNumber}
            observationId={draft.observationId}
            photos={draft.photos}
            onAdded={addPhoto}
            onRemoved={removePhoto}
          />
        </FormField>

        <NavigationButtons
          nextLabel="Generate recommended diagnostic checks"
          nextIcon={<LuSparkles />}
          onNext={generateCauses}
          nextLoading={generating}
        />

        {/*
          The draft survives a reload and a return trip from the project page,
          which is what an engineer wants after an accidental navigation. This
          is the explicit way to abandon it instead.
        */}
        {hydrated && hasContent(draft.form, draft.photos.length) && (
          <Button
            data-print="hide"
            variant="plain"
            size="sm"
            colorPalette="gray"
            alignSelf="flex-start"
            px="0"
            onClick={() => {
              reset();
              setShowErrors(false);
            }}
          >
            <LuRotateCcw />
            Start over
          </Button>
        )}
      </Stack>
    </WizardShell>
  );
}

function hasContent(form: ObservationForm, photoCount: number): boolean {
  return (
    photoCount > 0 ||
    form.equipment.length > 0 ||
    form.system.length > 0 ||
    form.location.length > 0 ||
    form.activity.length > 0 ||
    form.observation.length > 0
  );
}
