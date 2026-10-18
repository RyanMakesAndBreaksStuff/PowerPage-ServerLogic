import type { ReportModel } from '@/features/inspector/report/reportModel.types';
import type { SiteResult } from '@/types/inspector';
import type { ReportOptions } from '@/types/report';

export function buildReportModel(
  _r: SiteResult,
  _o: ReportOptions,
  _exportedAt: Date,
): ReportModel {
  throw new Error('not implemented: phase 16');
}
