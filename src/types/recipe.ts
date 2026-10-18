import type { HttpMethod } from '@/types/http';

export type RecipeId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8' | 'R9' | 'R10';
export type RecipeGroup = 'core' | 'tutorial' | 'reference';
export type AccessType = 'Global' | 'Contact' | 'Account' | 'Parent' | 'Self';
export type Privilege = 'Read' | 'Write' | 'Create' | 'Delete' | 'Append' | 'AppendTo';
export type TableGrant = {
  logicalName: string;
  entitySetName: string;
  privileges: readonly Privilege[];
  accessType: AccessType;
  relationship: string | null;
  note: string | null;
};
export type ExampleRequest = { query: string | null; body: unknown; liquidInput: string | null };
export type RecipeMeta = {
  id: RecipeId;
  name: string;
  group: RecipeGroup;
  defaultMethod: HttpMethod | null; // null only for R8
  functions: readonly string[]; // exported names, e.g. ['get','post','put','del'] or ['getSummary']
  mainObject: string;
  serverObjects: readonly string[];
  tables: readonly TableGrant[];
  outboundDomains: readonly string[];
  siteSettings: readonly string[];
  webRole: string;
  permissionNote: string;
  prerequisites: readonly string[];
  learnUrl: string | null;
  extraUrls: readonly string[];
  liquid: boolean;
  readsLiquidInput: boolean;
  upstreamCredentials: boolean;
  demoPage: boolean;
  examples: Readonly<Record<string, ExampleRequest>>; // keyed by function name
};
export type GeneratedHandler = { text: string; highlightLines: readonly number[] }; // LF text, 1-based lines
