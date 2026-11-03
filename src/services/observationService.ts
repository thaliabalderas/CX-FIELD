"use client";

import type { SaveObservationInput, SavedObservation } from "@/types";

import { apiDownload, apiGet, apiPost, apiPut } from "./apiClient";

function base(projectNumber: string): string {
  return `/api/projects/${encodeURIComponent(projectNumber)}/observations`;
}

export async function fetchObservations(
  projectNumber: string,
): Promise<SavedObservation[]> {
  const { observations } = await apiGet<{ observations: SavedObservation[] }>(
    base(projectNumber),
  );
  return observations;
}

export async function fetchObservation(
  projectNumber: string,
  observationId: string,
): Promise<SavedObservation> {
  const { observation } = await apiGet<{ observation: SavedObservation }>(
    `${base(projectNumber)}/${encodeURIComponent(observationId)}`,
  );
  return observation;
}

export async function saveObservation(
  projectNumber: string,
  input: SaveObservationInput,
): Promise<SavedObservation> {
  const { observation } = await apiPost<{ observation: SavedObservation }>(
    base(projectNumber),
    input,
  );
  return observation;
}

export async function updateObservation(
  projectNumber: string,
  input: SaveObservationInput,
): Promise<SavedObservation> {
  const { observation } = await apiPut<{ observation: SavedObservation }>(
    `${base(projectNumber)}/${encodeURIComponent(input.id)}`,
    input,
  );
  return observation;
}

/** Downloads the project's Excel deficiency log and hands it to the browser. */
export async function downloadProjectExcel(
  projectNumber: string,
): Promise<void> {
  const { blob, fileName } = await apiDownload(
    `/api/projects/${encodeURIComponent(projectNumber)}/export`,
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName ?? `${projectNumber}_Deficiency_Log.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
