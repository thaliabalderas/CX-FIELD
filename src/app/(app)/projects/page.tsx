"use client";

import {
  Box,
  Button,
  HStack,
  IconButton,
  Input,
  InputGroup,
  Menu,
  Portal,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  LuChevronRight,
  LuEllipsisVertical,
  LuFolderOpen,
  LuPencil,
  LuRefreshCw,
  LuSearch,
  LuTrash2,
  LuTriangleAlert,
} from "react-icons/lu";

import { EmptyState } from "@/components/EmptyState";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import {
  DeleteProjectDialog,
  RenameProjectDialog,
} from "@/components/ProjectDialogs";
import { PageShell } from "@/components/PageShell";
import { notifyError } from "@/components/ui/toaster";
import { fetchProjects } from "@/services/projectService";
import type { Project } from "@/types";

/**
 * The project list - the app's entry point, because an observation cannot be
 * recorded without a project to file it against.
 */
export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Bumped by "Try again" to re-run the load.
  const [attempt, setAttempt] = useState(0);
  const [renaming, setRenaming] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  useEffect(() => {
    let active = true;

    fetchProjects()
      .then((result) => {
        if (active) setProjects(result);
      })
      .catch((error: unknown) => {
        if (!active) return;
        notifyError("Could not load projects", error);
        // Deliberately NOT an empty list: a failed request that renders as
        // "No projects yet" reads as an empty database, which sends people
        // looking in the wrong place entirely.
        setLoadError(
          error instanceof Error
            ? error.message
            : "The project list could not be loaded.",
        );
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const visible = useMemo(() => {
    if (!projects) return [];
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return projects;
    return projects.filter(
      (project) =>
        project.projectNumber.toLowerCase().includes(needle) ||
        project.name.toLowerCase().includes(needle),
    );
  }, [projects, query]);

  return (
    <PageShell
      title="Projects"
      description="Select a project to record a commissioning field observation."
      width="5xl"
      actions={
        <NewProjectDialog
          onCreated={(project) =>
            setProjects((current) => [project, ...(current ?? [])])
          }
        />
      }
    >
      {loadError ? (
        <EmptyState
          icon={<LuTriangleAlert />}
          title="Could not load projects"
          description={loadError}
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setProjects(null);
                setLoadError(null);
                setAttempt((n) => n + 1);
              }}
            >
              <LuRefreshCw />
              Try again
            </Button>
          }
        />
      ) : projects === null ? (
        <HStack gap="3" py="8" justify="center">
          <Spinner size="sm" color="brand.solid" />
          <Text color="fg.muted">Loading projects…</Text>
        </HStack>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<LuFolderOpen />}
          title="No projects yet"
          description="Create a project to start recording field observations against it."
        />
      ) : (
        <Stack gap="4">
          {/* The search box only earns its space once the list is long enough
              to need it. */}
          {projects.length > 6 && (
            <InputGroup startElement={<LuSearch />} maxW={{ md: "sm" }}>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by number or name"
                autoComplete="off"
              />
            </InputGroup>
          )}

          {visible.length === 0 ? (
            <Text color="fg.muted" py="4">
              No projects match “{query}”.
            </Text>
          ) : (
            <Stack gap="0" borderWidth="1px" borderColor="line" borderRadius="lg" overflow="hidden">
              {visible.map((project, index) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  isFirst={index === 0}
                  onRename={() => setRenaming(project)}
                  onDelete={() => setDeleting(project)}
                />
              ))}
            </Stack>
          )}
        </Stack>
      )}

      {renaming && (
        <RenameProjectDialog
          key={renaming.id}
          project={renaming}
          open
          onClose={() => setRenaming(null)}
          onRenamed={(updated) =>
            setProjects((current) =>
              (current ?? []).map((item) =>
                item.id === updated.id ? updated : item,
              ),
            )
          }
        />
      )}
      {deleting && (
        <DeleteProjectDialog
          key={deleting.id}
          project={deleting}
          open
          onClose={() => setDeleting(null)}
          onDeleted={(removed) =>
            setProjects((current) =>
              (current ?? []).filter((item) => item.id !== removed.id),
            )
          }
        />
      )}
    </PageShell>
  );
}

function ProjectRow({
  project,
  isFirst,
  onRename,
  onDelete,
}: {
  project: Project;
  isFirst: boolean;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <HStack
      gap="0"
      borderTopWidth={isFirst ? "0" : "1px"}
      borderColor="line"
      transition="background 0.12s"
      _hover={{ bg: "surface.muted" }}
    >
      <Box
        asChild
        flex="1"
        minW="0"
        pl={{ base: 4, md: 5 }}
        pr="2"
        py={{ base: 4, md: 4 }}
        // A row-wide link, so the tap target on a phone is the whole row
        // rather than just the project name. The actions menu sits beside it,
        // not inside it, so opening the menu never navigates.
        _focusVisible={{ outline: "2px solid", outlineColor: "brand.focusRing", outlineOffset: "-2px" }}
      >
        <Link href={`/projects/${encodeURIComponent(project.projectNumber)}`}>
          <HStack justify="space-between" gap="4">
            <Stack gap="0.5" minW="0">
              <Text fontSize="sm" fontWeight="semibold" color="brand.fg">
                {project.projectNumber}
              </Text>
              <Text truncate>{project.name}</Text>
            </Stack>
            <Box color="fg.subtle" flexShrink="0">
              <LuChevronRight />
            </Box>
          </HStack>
        </Link>
      </Box>

      {/* Only the creator can rename or delete; the server enforces it too. */}
      {project.canManage ? (
        <Menu.Root positioning={{ placement: "bottom-end" }}>
          <Menu.Trigger asChild>
            <IconButton
              variant="ghost"
              size="sm"
              colorPalette="gray"
              aria-label={`Actions for project ${project.projectNumber}`}
              mr={{ base: 2, md: 3 }}
            >
              <LuEllipsisVertical />
            </IconButton>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content minW="44">
                <Menu.Item value="rename" onClick={onRename}>
                  <LuPencil />
                  Rename
                </Menu.Item>
                <Menu.Item
                  value="delete"
                  color="fg.error"
                  _hover={{ bg: "bg.error", color: "fg.error" }}
                  onClick={onDelete}
                >
                  <LuTrash2 />
                  Delete
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      ) : (
        <Box w={{ base: 2, md: 3 }} />
      )}
    </HStack>
  );
}
