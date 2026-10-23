import type { CheckId, CheckStatus, Counts } from '@/types/inspector';
import type { ReportFormat, ReportScope } from '@/types/report';

export type ReportLine = { readonly label: string; readonly text: string };
export type ReportCheck = {
  readonly check: CheckId;
  readonly title: string;
  readonly status: CheckStatus;
  readonly statusText: string;
  readonly finding: string;
  readonly reasons: readonly string[];
  readonly guidance: string;
  readonly questions: readonly string[];
  readonly detail: readonly string[];
};
export type ReportRow = {
  readonly fileId: string;
  readonly name: string;
  readonly active: boolean;
  readonly counts: Counts;
  readonly summary: string;
  readonly result: 'Ready' | 'Needs review' | 'Incomplete';
  readonly checks: readonly ReportCheck[];
};
export type ReportSection = {
  readonly fileName: string;
  readonly check: CheckId;
  readonly title: string;
  readonly summary: string;
  readonly reasons: readonly string[];
  readonly guidance: string;
  readonly questions: readonly string[];
  readonly detail: readonly string[];
};
export type ReportSnapshot = {
  readonly fileName: string;
  readonly roles: readonly string[];
  readonly tables: readonly string[];
  readonly outbound: readonly string[];
};

// Contains display-ready, redacted text; renderers alone own format-specific escaping.
export type ReportModel = {
  readonly scope: ReportScope;
  readonly format: ReportFormat;
  readonly stem: string;
  readonly title: string;
  readonly header: { readonly brand: string; readonly label: string; readonly exportedAt: string };
  readonly lines: readonly ReportLine[];
  readonly counts: Counts;
  readonly fileCounts: {
    readonly ready: number;
    readonly needsReview: number;
    readonly incomplete: number;
  };
  readonly headline: string;
  readonly banners: readonly string[];
  readonly rows: readonly ReportRow[];
  readonly needsReview: readonly ReportSection[];
  readonly reviewFirst: readonly ReportSection[];
  readonly notScanned: readonly ReportSection[];
  readonly snapshot: readonly ReportSnapshot[] | null;
  readonly footer: readonly string[];
};
