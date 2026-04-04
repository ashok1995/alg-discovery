/**
 * Path segments for immutable updates in nested settings / JSON-like trees.
 */

export type PathSegment = string | number;

/** Immutable patch callback for nested settings forms. */
export type StructuredPatchHandler = (path: PathSegment[], value: unknown) => void;
