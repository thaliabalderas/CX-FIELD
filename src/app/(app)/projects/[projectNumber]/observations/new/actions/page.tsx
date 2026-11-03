"use client";

import { Box, HStack, Spinner, Stack, Text } from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { LuFileText } from "react-icons/lu";

import { NavigationButtons } from "@/components/NavigationButtons";
import { SelectableItemList } from "@/components/SelectableItemList";
import { WizardShell } from "@/components/WizardShell";
import { useObservationDraft } from "@/context/ObservationDraftContext";
import { useStepGuard } from "@/hooks/useStepGuard";
import { wizardPath } from "@/lib/workflowSteps";

/** Step 3 - the corrective actions the engineer is prepared to put their name to. */
export default function ActionsStepPage() {
  const params = useParams<{ projectNumber: string }>();
  const projectNumber = decodeURIComponent(params.projectNumber);
  const router = useRouter();

  const { draft, toggleAction, editAction, removeAction, addCustomAction } =
    useObservationDraft();
  const { ready } = useStepGuard(projectNumber, "actions");

  const selectedCauses = draft.causes.filter((cause) => cause.selected);
  const selectedActions = draft.actions.filter((action) => action.selected);

  if (!ready) {
    return (
      <WizardShell projectNumber={projectNumber} step="actions">
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
      step="actions"
      description="Select the corrective actions to include, and edit the wording so it reads the way you want it on the report."
    >
      <Stack gap={{ base: 5, md: 6 }}>
        {/* The accepted causes, so the engineer can judge whether each action
            actually addresses them. */}
        <Box
          borderWidth="1px"
          borderColor="line"
          borderRadius="md"
          bg="surface.muted"
          px="4"
          py="3"
        >
          <Stack gap="2">
            <Text
              fontSize="xs"
              fontWeight="semibold"
              color="fg.muted"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Diagnostic checks you selected
            </Text>
            <Stack as="ul" gap="1.5" pl="4">
              {selectedCauses.map((cause) => (
                <Text as="li" key={cause.id} fontSize="sm">
                  {cause.text}
                </Text>
              ))}
            </Stack>
          </Stack>
        </Box>

        <SelectableItemList
          legend="Suggested corrective actions"
          helperText="Select any number. Edit the wording of any action, or add one of your own."
          items={draft.actions}
          onToggle={toggleAction}
          onEdit={editAction}
          onRemove={removeAction}
          onAddCustom={addCustomAction}
          addLabel="Add your own corrective action"
          addPlaceholder="Describe the corrective action in your own words…"
          noun="corrective action"
        />

        <NavigationButtons
          onBack={() => router.push(wizardPath(projectNumber, "causes"))}
          nextLabel="Generate report"
          nextIcon={<LuFileText />}
          onNext={() => router.push(wizardPath(projectNumber, "report"))}
          nextDisabled={selectedActions.length === 0}
        />

        {selectedActions.length === 0 && (
          <Text fontSize="sm" color="fg.muted">
            Select at least one corrective action to continue.
          </Text>
        )}
      </Stack>
    </WizardShell>
  );
}
