"use client";

import { HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { LuSparkles } from "react-icons/lu";

import { NavigationButtons } from "@/components/NavigationButtons";
import { ObservationRecap } from "@/components/ObservationRecap";
import { SelectableItemList } from "@/components/SelectableItemList";
import { WizardShell } from "@/components/WizardShell";
import { notifyError } from "@/components/ui/toaster";
import { useObservationDraft } from "@/context/ObservationDraftContext";
import { useStepGuard } from "@/hooks/useStepGuard";
import { wizardPath } from "@/lib/workflowSteps";
import { fetchCorrectiveActions } from "@/services/aiService";

/** Step 2 - which of the suggested causes the engineer actually accepts. */
export default function CausesStepPage() {
  const params = useParams<{ projectNumber: string }>();
  const projectNumber = decodeURIComponent(params.projectNumber);
  const router = useRouter();

  const {
    draft,
    toggleCause,
    editCause,
    removeCause,
    addCustomCause,
    setActions,
  } = useObservationDraft();
  const { ready } = useStepGuard(projectNumber, "causes");

  const [generating, setGenerating] = useState(false);

  const selected = draft.causes.filter((cause) => cause.selected);

  async function generateActions() {
    setGenerating(true);
    try {
      const actions = await fetchCorrectiveActions(
        projectNumber,
        draft.form,
        draft.photos,
        selected.map((cause) => cause.text),
      );
      setActions(actions);
      router.push(wizardPath(projectNumber, "actions"));
    } catch (error) {
      notifyError("Could not generate suggested corrective actions", error);
    } finally {
      setGenerating(false);
    }
  }

  if (!ready) {
    return (
      <WizardShell projectNumber={projectNumber} step="causes">
        <HStack gap="3" py="8" justify="center">
          <Spinner size="sm" color="brand.solid" />
          <Text color="fg.muted">Loading…</Text>
        </HStack>
      </WizardShell>
    );
  }

  return (
    <WizardShell
      projectNumber={projectNumber}
      step="causes"
      description="Select the checks you will carry out. These are suggestions to guide troubleshooting, not confirmed causes - nothing reaches the report unless you select it."
    >
      <Stack gap={{ base: 5, md: 6 }}>
        <ObservationRecap form={draft.form} />

        <SelectableItemList
          legend="Recommended diagnostic checks"
          helperText="Select any number. Edit the wording of any check, or add one of your own."
          items={draft.causes}
          onToggle={toggleCause}
          onEdit={editCause}
          onRemove={removeCause}
          onAddCustom={addCustomCause}
          addLabel="Add your own check"
          addPlaceholder="Describe the check in your own words…"
          noun="diagnostic check"
        />

        <NavigationButtons
          onBack={() => router.push(wizardPath(projectNumber, "observation"))}
          nextLabel="Generate suggested corrective actions"
          nextIcon={<LuSparkles />}
          onNext={generateActions}
          nextLoading={generating}
          nextDisabled={selected.length === 0}
        />

        {selected.length === 0 && (
          <Text fontSize="sm" color="fg.muted">
            Select at least one diagnostic check to continue.
          </Text>
        )}
      </Stack>
    </WizardShell>
  );
}
