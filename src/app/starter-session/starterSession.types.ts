import type { BrowserCheckResult, TextChange } from '@/lib/code-analysis/codeAnalysis.types';
import type { Notice } from '@/services/pptb/host.types';
import type { ClientLanguage, HttpMethod } from '@/types/http';
import type { RecipeId } from '@/types/recipe';

export type StarterState = {
  name: string;
  method: HttpMethod | null;
  recipe: RecipeId;
  language: ClientLanguage;
  serverText: string;
  generatedText: string;
  cursor: number | null;
  reviewedText: string | null; // AC-5.4: text at the moment of marking
  pendingNotice: Notice | null; // e.g. Liquid auto-reset toast (AC-4.7)
};
export type StarterAction =
  | { type: 'setName'; name: string }
  | { type: 'setMethod'; method: HttpMethod }
  | { type: 'selectRecipe'; recipe: RecipeId }
  | { type: 'setLanguage'; language: ClientLanguage }
  | { type: 'editServer'; text: string; cursor: number | null }
  | { type: 'setCursor'; cursor: number | null }
  | { type: 'applyChanges'; changes: readonly TextChange[]; cursor: number | null }
  | { type: 'markReviewed' }
  | { type: 'undoReview' }
  | { type: 'startOver' }
  | { type: 'clearNotice' };
export type StarterDerived = {
  slug: string;
  slugDiffers: boolean;
  fn: string;
  edited: boolean;
  checks: BrowserCheckResult;
  liquidAllowed: boolean;
  usedMembers: ReadonlyMap<string, readonly string[]>;
  readiness: { browser: boolean; validation: true; permissions: boolean };
  ready: 0 | 1 | 2 | 3;
};
export type StarterPackageInput = {
  state: StarterState;
  derived: StarterDerived;
  clientText: string;
};
