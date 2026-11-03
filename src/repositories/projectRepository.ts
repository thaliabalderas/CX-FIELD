import "server-only";

import { cosmosStatus, projectsContainer } from "@/lib/azure/cosmos";
import { currentUser } from "@/lib/currentUser";
import type { NewProjectInput, Project } from "@/types";

/**
 * All Cosmos access for projects. Route handlers call these; nothing else in
 * the app touches the database.
 */

export class ProjectAlreadyExistsError extends Error {
  constructor(projectNumber: string) {
    super(
      `Project ${projectNumber} already exists (it may have been deleted - deleted project numbers stay reserved).`,
    );
    this.name = "ProjectAlreadyExistsError";
  }
}

export async function listProjects(): Promise<Project[]> {
  const { resources } = await projectsContainer()
    .items.query<Project>({
      query:
        "SELECT c.id, c.projectNumber, c.name, c.createdAt, c.createdBy, c.updatedAt FROM c WHERE NOT IS_DEFINED(c.deletedAt) ORDER BY c.createdAt DESC",
    })
    .fetchAll();
  return resources;
}

export async function getProject(projectNumber: string): Promise<Project | null> {
  try {
    // `id` is set equal to `projectNumber`, so this is a point read - the
    // cheapest operation Cosmos offers - rather than a query.
    const { resource } = await projectsContainer()
      .item(projectNumber, projectNumber)
      .read<Project>();
    // A soft-deleted project behaves as if it does not exist.
    if (!resource || resource.deletedAt) return null;
    return resource;
  } catch (error) {
    if (cosmosStatus(error) === 404) return null;
    throw error;
  }
}

export async function createProject(input: NewProjectInput): Promise<Project> {
  const now = new Date().toISOString();
  const project: Project = {
    // Deliberately identical to the partition key: it makes every lookup a
    // point read and lets Cosmos itself enforce uniqueness of project numbers.
    id: input.projectNumber,
    projectNumber: input.projectNumber,
    name: input.name,
    createdAt: now,
    createdBy: await currentUser(),
    updatedAt: now,
  };

  try {
    const { resource } = await projectsContainer().items.create(project, {
      disableAutomaticIdGeneration: true,
    });
    return resource ?? project;
  } catch (error) {
    if (cosmosStatus(error) === 409) {
      throw new ProjectAlreadyExistsError(input.projectNumber);
    }
    throw error;
  }
}

export class ProjectNotFoundError extends Error {
  constructor(projectNumber: string) {
    super(`Project ${projectNumber} was not found.`);
    this.name = "ProjectNotFoundError";
  }
}

/** The signed-in user is not the project's creator. */
export class ProjectForbiddenError extends Error {
  constructor() {
    super("Only the person who created this project can change or delete it.");
    this.name = "ProjectForbiddenError";
  }
}

/** Someone else changed the project between the read and the write. */
export class ProjectConflictError extends Error {
  constructor() {
    super("This project was changed by someone else. Reload and try again.");
    this.name = "ProjectConflictError";
  }
}

export function isProjectCreator(project: Project, user: string): boolean {
  return project.createdBy.toLowerCase() === user.toLowerCase();
}

/**
 * Read-modify-write guarded by the document's ETag, so two people editing the
 * same project cannot silently overwrite one another. Throws if the project is
 * missing, soft-deleted, or not created by the current user.
 */
async function updateOwnProject(
  projectNumber: string,
  change: (project: Project, user: string) => Project,
): Promise<Project> {
  const user = await currentUser();
  const item = projectsContainer().item(projectNumber, projectNumber);

  let stored: (Project & { _etag?: string }) | undefined;
  try {
    ({ resource: stored } = await item.read<Project & { _etag?: string }>());
  } catch (error) {
    if (cosmosStatus(error) !== 404) throw error;
  }
  if (!stored || stored.deletedAt) throw new ProjectNotFoundError(projectNumber);
  if (!isProjectCreator(stored, user)) throw new ProjectForbiddenError();

  try {
    const { resource } = await item.replace(change(stored, user), {
      accessCondition: { type: "IfMatch", condition: stored._etag ?? "" },
    });
    return resource ?? stored;
  } catch (error) {
    if (cosmosStatus(error) === 412) throw new ProjectConflictError();
    throw error;
  }
}

/** Renames a project. The project number never changes: it is the id, the
 *  partition key and the blob folder name. */
export async function renameProject(
  projectNumber: string,
  name: string,
): Promise<Project> {
  return updateOwnProject(projectNumber, (project) => ({
    ...project,
    name,
    updatedAt: new Date().toISOString(),
  }));
}

/**
 * Soft delete: stamps the project as deleted and nothing else. Observations
 * and photos are deliberately left untouched, so the data can be restored by
 * clearing `deletedAt` on the project document.
 */
export async function softDeleteProject(projectNumber: string): Promise<void> {
  await updateOwnProject(projectNumber, (project, user) => {
    const now = new Date().toISOString();
    return { ...project, deletedAt: now, deletedBy: user, updatedAt: now };
  });
}
