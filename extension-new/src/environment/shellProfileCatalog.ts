/**
 * Structured representation of one parsed export value.
 */
export interface ParsedProfileValue {
  present: boolean;
  value: string;
}

/**
 * One writable DEREKALGOS profile value set managed by the extension.
 */
export interface AlgorithmsProfileWritableValues {
  timeout?: string | null;
  eiffel?: string | null;
  gcc13Directory?: string | null;
  gcc13Name?: string | null;
  gxx13Name?: string | null;
  dockerMapText?: string | null;
  sshMapText?: string | null;
}

/**
 * One parsed DEREKALGOS profile value set read from the managed profile block.
 */
export interface AlgorithmsProfileValues {
  timeout: ParsedProfileValue;
  eiffel: ParsedProfileValue;
  gcc13Directory: ParsedProfileValue;
  gcc13Name: ParsedProfileValue;
  gxx13Name: ParsedProfileValue;
  dockerMapText: ParsedProfileValue;
  sshMapText: ParsedProfileValue;
}

/**
 * One shared catalog entry for a managed DEREKALGOS profile variable.
 */
export interface AlgorithmsProfileCatalogEntry {
  key: keyof AlgorithmsProfileWritableValues;
  exportName: string;
}

/**
 * Canonical managed DEREKALGOS profile variable catalog.
 */
export const ALGORITHMS_PROFILE_VARIABLES: AlgorithmsProfileCatalogEntry[] = [
  {
    key: "timeout",
    exportName: "DEREKALGOS_TIMEOUT",
  },
  {
    key: "eiffel",
    exportName: "DEREKALGOS_EIFFEL",
  },
  {
    key: "gcc13Directory",
    exportName: "DEREKALGOS_GCC13",
  },
  {
    key: "gcc13Name",
    exportName: "DEREKALGOS_GCC13NAME",
  },
  {
    key: "gxx13Name",
    exportName: "DEREKALGOS_GXX13NAME",
  },
  {
    key: "dockerMapText",
    exportName: "DEREKALGOS_RUNONDOCKER",
  },
  {
    key: "sshMapText",
    exportName: "DEREKALGOS_RUNONSSH",
  },
];
