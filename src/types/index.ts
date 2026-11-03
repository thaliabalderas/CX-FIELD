/**
 * Shared contract between components, the client service layer and the
 * server-side route handlers. Anything that crosses the network boundary is
 * described here exactly once.
 */

/** A commissioning project. Everything else in the app hangs off one of these. */
export type Project = {
  /** Equal to `projectNumber` - see the Cosmos notes in the README. */
  id: string;
  projectNumber: string;
  name: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  /**
   * Set when the project is deleted. Deletion is soft: the project, its
   * observations and its photos stay in storage, and the project simply stops
   * appearing. Absent on every live project.
   */
  deletedAt?: string;
  deletedBy?: string;
  /** Computed per request for the signed-in user; never stored. */
  canManage?: boolean;
};

export type NewProjectInput = {
  projectNumber: string;
  name: string;
};

/**
 * One candidate failure cause or corrective action while the engineer is still
 * working. Causes and actions share this shape deliberately, which is what
 * lets `SelectableItemList` be written once instead of twice.
 */
export type SelectableItem = {
  id: string;
  text: string;
  selected: boolean;
  /** Engineer-authored rather than suggested. Custom items can be deleted. */
  isCustom: boolean;
};

/** The subset of a `SelectableItem` that is worth persisting. */
export type RecordedItem = {
  id: string;
  text: string;
  isCustom: boolean;
};

export type ObservationPhoto = {
  id: string;
  /** Path within the private blob container: `{projectNumber}/{observationId}/{photoId}.jpg` */
  blobPath: string;
  fileName: string;
  caption?: string;
};

/** The Step 1 field observation form. */
export type ObservationForm = {
  equipment: string;
  system: string;
  location: string;
  activity: string;
  observation: string;
  /** `yyyy-mm-dd`, the date the observation was made in the field. */
  observedDate: string;
};

/** A finalised observation as stored in Cosmos. */
export type SavedObservation = ObservationForm & {
  id: string;
  projectNumber: string;
  photos: ObservationPhoto[];
  /** Only the causes the engineer actually selected. */
  causes: RecordedItem[];
  /** Only the corrective actions the engineer actually selected. */
  actions: RecordedItem[];
  status: "final";
  createdAt: string;
  createdBy: string;
  updatedAt: string;
};

/** What the client POSTs when saving from Step 4. */
export type SaveObservationInput = ObservationForm & {
  id: string;
  photos: ObservationPhoto[];
  causes: RecordedItem[];
  actions: RecordedItem[];
};

/** Request body for both mock-AI endpoints. */
export type SuggestionRequest = ObservationForm & {
  projectNumber: string;
  /** Blob paths of the observation's photos, which the model looks at. */
  photoPaths: string[];
  /** Sent only to the corrective-actions endpoint. */
  selectedCauses?: string[];
};

/** Uniform error body returned by every route handler. */
export type ApiError = {
  error: string;
};
