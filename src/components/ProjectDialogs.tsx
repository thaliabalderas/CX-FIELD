"use client";

import {
  Button,
  CloseButton,
  Dialog,
  Input,
  Portal,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";

import { FormField } from "@/components/FormField";
import { notifyError, toaster } from "@/components/ui/toaster";
import { deleteProject, renameProject } from "@/services/projectService";
import type { Project } from "@/types";

type DialogProps = {
  project: Project;
  open: boolean;
  onClose: () => void;
};

/** Renames a project. Only the name is editable: the project number is the
 *  record's id and the folder its photos live in. */
export function RenameProjectDialog({
  project,
  open,
  onClose,
  onRenamed,
}: DialogProps & { onRenamed: (project: Project) => void }) {
  const [name, setName] = useState(project.name);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  async function submit() {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError("Enter the project name.");
      return;
    }
    if (trimmed === project.name) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const updated = await renameProject(project.projectNumber, trimmed);
      toaster.create({ type: "success", title: "Project renamed" });
      onRenamed({ ...project, ...updated });
      onClose();
    } catch (failure) {
      notifyError("Could not rename the project", failure);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(event) => {
        if (!event.open) onClose();
      }}
      placement="center"
      motionPreset="slide-in-bottom"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content mx="4">
            <Dialog.Header>
              <Dialog.Title>Rename project</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <FormField
                label="Project name"
                required
                helperText={`Project ${project.projectNumber}. The project number cannot be changed.`}
                error={error}
              >
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void submit();
                  }}
                  autoFocus
                />
              </FormField>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" disabled={saving}>
                  Cancel
                </Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="brand" loading={saving} onClick={submit}>
                Save name
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

/**
 * Deletes a project, after the engineer types its number. The deletion is soft
 * on the server - the project disappears from the app but its observations and
 * photos are kept - and the wording here says so honestly.
 */
export function DeleteProjectDialog({
  project,
  open,
  onClose,
  onDeleted,
}: DialogProps & { onDeleted: (project: Project) => void }) {
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  const confirmed = typed.trim() === project.projectNumber;

  async function submit() {
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deleteProject(project.projectNumber);
      toaster.create({
        type: "success",
        title: `Project ${project.projectNumber} deleted`,
      });
      onDeleted(project);
      onClose();
    } catch (failure) {
      notifyError("Could not delete the project", failure);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(event) => {
        if (!event.open) onClose();
      }}
      placement="center"
      motionPreset="slide-in-bottom"
      role="alertdialog"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content mx="4">
            <Dialog.Header>
              <Dialog.Title>Delete project?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap="4">
                <Text>
                  <strong>
                    {project.projectNumber} — {project.name}
                  </strong>{" "}
                  and its observations will be removed from the app. The
                  records and photos are retained in storage, but you will not
                  be able to restore them yourself.
                </Text>
                <FormField
                  label={`Type ${project.projectNumber} to confirm`}
                  required
                >
                  <Input
                    value={typed}
                    onChange={(event) => setTyped(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void submit();
                    }}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </FormField>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" disabled={deleting}>
                  Cancel
                </Button>
              </Dialog.ActionTrigger>
              <Button
                colorPalette="red"
                loading={deleting}
                disabled={!confirmed}
                onClick={submit}
              >
                Delete project
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
