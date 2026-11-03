"use client";

import type { NewProjectInput, Project } from "@/types";

import { apiDelete, apiGet, apiPatch, apiPost } from "./apiClient";

export async function fetchProjects(): Promise<Project[]> {
  const { projects } = await apiGet<{ projects: Project[] }>("/api/projects");
  return projects;
}

export async function fetchProject(projectNumber: string): Promise<Project> {
  const { project } = await apiGet<{ project: Project }>(
    `/api/projects/${encodeURIComponent(projectNumber)}`,
  );
  return project;
}

export async function createProject(input: NewProjectInput): Promise<Project> {
  const { project } = await apiPost<{ project: Project }>(
    "/api/projects",
    input,
  );
  return project;
}

export async function renameProject(
  projectNumber: string,
  name: string,
): Promise<Project> {
  const { project } = await apiPatch<{ project: Project }>(
    `/api/projects/${encodeURIComponent(projectNumber)}`,
    { name },
  );
  return project;
}

/** Soft delete: the project is hidden; its observations and photos are kept. */
export async function deleteProject(projectNumber: string): Promise<void> {
  await apiDelete<{ deleted: true }>(
    `/api/projects/${encodeURIComponent(projectNumber)}`,
    { confirmProjectNumber: projectNumber },
  );
}
