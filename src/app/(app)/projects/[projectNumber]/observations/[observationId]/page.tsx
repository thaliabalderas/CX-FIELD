"use client";

import {
  Box,
  Button,
  HStack,
  Input,
  Spinner,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LuPrinter, LuSave, LuUndo2 } from "react-icons/lu";

import { FormField } from "@/components/FormField";
import { PageShell } from "@/components/PageShell";
import { PhotoUpload } from "@/components/PhotoUpload";
import { ProjectBreadcrumb } from "@/components/ProjectBreadcrumb";
import { ReportPreview } from "@/components/ReportPreview";
import { SelectableItemList } from "@/components/SelectableItemList";
import { notifyError, toaster } from "@/components/ui/toaster";
import { newItemId } from "@/lib/ids";
import {
  missingObservationFields,
  OBSERVATION_FIELD_LABELS,
} from "@/lib/validation";
import {
  fetchObservation,
  updateObservation,
} from "@/services/observationService";
import { fetchProject } from "@/services/projectService";
import type {
  ObservationForm,
  ObservationPhoto,
  RecordedItem,
  SaveObservationInput,
  SavedObservation,
  SelectableItem,
} from "@/types";

/** The editable copy of a saved observation. */
type Edits = {
  form: ObservationForm;
  photos: ObservationPhoto[];
  causes: SelectableItem[];
  actions: SelectableItem[];
};

/**
 * A saved field observation.
 *
 * On screen every field is editable, using the same controls as the wizard.
 * The formatted report is print-only: "Print report" prints the *saved*
 * record, so it is disabled while there are unsaved edits rather than
 * printing something that does not match the database.
 *
 * Only the causes and actions the engineer selected were ever stored, so they
 * come back as ticked cards. Unticking one drops it on save.
 */
export default function SavedObservationPage() {
  const params = useParams<{ projectNumber: string; observationId: string }>();
  const projectNumber = decodeURIComponent(params.projectNumber);
  const observationId = params.observationId;

  const [saved, setSaved] = useState<SavedObservation | null>(null);
  const [edits, setEdits] = useState<Edits | null>(null);
  const [projectName, setProjectName] = useState<string | undefined>();
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    let active = true;

    fetchObservation(projectNumber, observationId)
      .then((result) => {
        if (!active) return;
        setSaved(result);
        setEdits(toEdits(result));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setFailed(true);
        notifyError("Could not load the field observation", error);
      });

    fetchProject(projectNumber)
      .then((project) => {
        if (active) setProjectName(project.name);
      })
      .catch(() => {
        // The page stands without it.
      });

    return () => {
      active = false;
    };
  }, [projectNumber, observationId]);

  const dirty = useMemo(
    () =>
      saved !== null &&
      edits !== null &&
      JSON.stringify(toInput(saved.id, edits)) !==
        JSON.stringify(toInput(saved.id, toEdits(saved))),
    [saved, edits],
  );

  // Closing the tab or reloading with unsaved edits asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const backToProject = (
    <Button
      asChild
      variant="outline"
      size={{ base: "lg", md: "md" }}
      width={{ base: "full", md: "auto" }}
    >
      <Link href={`/projects/${encodeURIComponent(projectNumber)}`}>
        Back to project
      </Link>
    </Button>
  );

  if (failed) {
    return (
      <PageShell
        title="Observation not found"
        description="It may have been removed, or the link may be incorrect."
        width="3xl"
      >
        {backToProject}
      </PageShell>
    );
  }

  function update(change: (current: Edits) => Edits) {
    setEdits((current) => (current ? change(current) : current));
  }

  function setField(field: keyof ObservationForm, value: string) {
    update((current) => ({
      ...current,
      form: { ...current.form, [field]: value },
    }));
  }

  /** Select / edit / add / remove for either list, written once. */
  function listOps(key: "causes" | "actions") {
    const set = (change: (items: SelectableItem[]) => SelectableItem[]) =>
      update((current) => ({ ...current, [key]: change(current[key]) }));

    return {
      onToggle: (id: string) =>
        set((items) =>
          items.map((item) =>
            item.id === id ? { ...item, selected: !item.selected } : item,
          ),
        ),
      onEdit: (id: string, text: string) =>
        set((items) =>
          items.map((item) => (item.id === id ? { ...item, text } : item)),
        ),
      onRemove: (id: string) =>
        set((items) => items.filter((item) => item.id !== id)),
      onAddCustom: (text: string) =>
        set((items) => [
          ...items,
          { id: newItemId(), text: text.trim(), selected: true, isCustom: true },
        ]),
    };
  }

  const missing = edits ? missingObservationFields(edits.form) : [];
  const noCauses = edits ? !edits.causes.some((item) => item.selected) : false;
  const noActions = edits ? !edits.actions.some((item) => item.selected) : false;

  function errorFor(field: keyof ObservationForm): string | undefined {
    if (!showErrors || !missing.includes(field)) return undefined;
    return `${OBSERVATION_FIELD_LABELS[field]} is required.`;
  }

  async function save() {
    if (!saved || !edits) return;
    if (missing.length > 0 || noCauses || noActions) {
      setShowErrors(true);
      return;
    }

    setSaving(true);
    try {
      const result = await updateObservation(
        projectNumber,
        toInput(saved.id, edits),
      );
      setSaved(result);
      setEdits(toEdits(result));
      setShowErrors(false);
      toaster.create({ type: "success", title: "Changes saved" });
    } catch (error) {
      notifyError("Could not save your changes", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      eyebrow={
        <ProjectBreadcrumb
          projectNumber={projectNumber}
          trailing={saved ? saved.equipment : "Observation"}
        />
      }
      title="Field Observation"
      description={saved ? `Recorded against project ${projectNumber}` : undefined}
      width="3xl"
      actions={
        <Stack direction={{ base: "column", md: "row" }} gap="3">
          <Button
            variant="outline"
            size={{ base: "lg", md: "md" }}
            width={{ base: "full", md: "auto" }}
            disabled={!saved || dirty}
            title={dirty ? "Save your changes before printing." : undefined}
            onClick={() => window.print()}
          >
            <LuPrinter />
            Print report
          </Button>
          {backToProject}
        </Stack>
      }
    >
      {saved === null || edits === null ? (
        <HStack gap="3" py="8" justify="center">
          <Spinner size="sm" color="brand.solid" />
          <Text color="fg.muted">Loading the observation…</Text>
        </HStack>
      ) : (
        <>
          {/* The issued document. Print-only, and always the saved record. */}
          <Box data-print="only">
            <ReportPreview
              projectNumber={projectNumber}
              projectName={projectName}
              form={toEdits(saved).form}
              photos={saved.photos}
              causes={saved.causes}
              actions={saved.actions}
            />
          </Box>

          <Stack gap={{ base: 6, md: 8 }} data-print="hide">
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
                    value={edits.form.equipment}
                    onChange={(event) => setField("equipment", event.target.value)}
                    autoComplete="off"
                  />
                </FormField>

                <FormField
                  label={OBSERVATION_FIELD_LABELS.system}
                  required
                  error={errorFor("system")}
                >
                  <Input
                    value={edits.form.system}
                    onChange={(event) => setField("system", event.target.value)}
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
                    value={edits.form.location}
                    onChange={(event) => setField("location", event.target.value)}
                    autoComplete="off"
                  />
                </FormField>

                <FormField label={OBSERVATION_FIELD_LABELS.observedDate} required>
                  <Input
                    type="date"
                    value={edits.form.observedDate}
                    onChange={(event) =>
                      setField("observedDate", event.target.value)
                    }
                  />
                </FormField>
              </Stack>

              <FormField
                label={OBSERVATION_FIELD_LABELS.activity}
                required
                error={errorFor("activity")}
              >
                <Input
                  value={edits.form.activity}
                  onChange={(event) => setField("activity", event.target.value)}
                  autoComplete="off"
                />
              </FormField>

              <FormField
                label={OBSERVATION_FIELD_LABELS.observation}
                required
                error={errorFor("observation")}
              >
                <Textarea
                  value={edits.form.observation}
                  onChange={(event) =>
                    setField("observation", event.target.value)
                  }
                  rows={4}
                  autoresize
                />
              </FormField>

              <FormField label="Field photos">
                <PhotoUpload
                  projectNumber={projectNumber}
                  observationId={saved.id}
                  photos={edits.photos}
                  onAdded={(photo) =>
                    update((current) => ({
                      ...current,
                      photos: [...current.photos, photo],
                    }))
                  }
                  onRemoved={(photoId) =>
                    update((current) => ({
                      ...current,
                      photos: current.photos.filter(
                        (photo) => photo.id !== photoId,
                      ),
                    }))
                  }
                />
              </FormField>
            </Stack>

            <Stack gap="2">
              <SelectableItemList
                legend="Recommended diagnostic checks"
                helperText="Untick a check to remove it from this observation."
                items={edits.causes}
                addLabel="Add a check"
                addPlaceholder="Describe another diagnostic check"
                noun="diagnostic check"
                {...listOps("causes")}
              />
              {showErrors && noCauses && (
                <Text fontSize="sm" color="fg.error">
                  Select at least one recommended diagnostic check.
                </Text>
              )}
            </Stack>

            <Stack gap="2">
              <SelectableItemList
                legend="Suggested corrective actions"
                helperText="Untick an action to remove it from this observation."
                items={edits.actions}
                addLabel="Add a corrective action"
                addPlaceholder="Describe another corrective action"
                noun="corrective action"
                {...listOps("actions")}
              />
              {showErrors && noActions && (
                <Text fontSize="sm" color="fg.error">
                  Select at least one suggested corrective action.
                </Text>
              )}
            </Stack>

            {/* Kept in reach at the bottom of the screen on a long form. */}
            <Box
              position="sticky"
              bottom="0"
              bg="white"
              borderTopWidth="1px"
              borderColor="line"
              py="3"
              zIndex="docked"
            >
              <Stack
                direction={{ base: "column-reverse", sm: "row" }}
                gap="3"
                justify="flex-end"
                align={{ base: "stretch", sm: "center" }}
              >
                {dirty && (
                  <Text
                    fontSize="sm"
                    color="fg.muted"
                    mr={{ sm: "auto" }}
                    textAlign={{ base: "center", sm: "start" }}
                  >
                    You have unsaved changes.
                  </Text>
                )}
                <Button
                  variant="ghost"
                  size={{ base: "lg", md: "md" }}
                  disabled={!dirty || saving}
                  onClick={() => {
                    setEdits(toEdits(saved));
                    setShowErrors(false);
                  }}
                >
                  <LuUndo2 />
                  Discard changes
                </Button>
                <Button
                  colorPalette="brand"
                  size={{ base: "lg", md: "md" }}
                  disabled={!dirty}
                  loading={saving}
                  loadingText="Saving"
                  onClick={() => void save()}
                >
                  <LuSave />
                  Save changes
                </Button>
              </Stack>
            </Box>
          </Stack>
        </>
      )}
    </PageShell>
  );
}

function toEdits(observation: SavedObservation): Edits {
  const toSelectable = (items: RecordedItem[]): SelectableItem[] =>
    items.map((item) => ({ ...item, selected: true }));

  return {
    form: {
      equipment: observation.equipment,
      system: observation.system,
      location: observation.location,
      activity: observation.activity,
      observation: observation.observation,
      observedDate: observation.observedDate,
    },
    photos: observation.photos,
    causes: toSelectable(observation.causes),
    actions: toSelectable(observation.actions),
  };
}

/** What is sent on save: only the ticked causes and actions are kept. */
function toInput(id: string, edits: Edits): SaveObservationInput {
  const toRecorded = (items: SelectableItem[]): RecordedItem[] =>
    items
      .filter((item) => item.selected)
      .map(({ id: itemId, text, isCustom }) => ({ id: itemId, text, isCustom }));

  return {
    id,
    ...edits.form,
    photos: edits.photos,
    causes: toRecorded(edits.causes),
    actions: toRecorded(edits.actions),
  };
}
