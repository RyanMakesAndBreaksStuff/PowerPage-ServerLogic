import type { ReportModel } from '@/features/inspector/report/reportModel.types';
import type { SiteResult } from '@/types/inspector';
import type { ReportOptions } from '@/types/report';

type ReportIdentity = Pick<ReportModel, 'scope' | 'format' | 'stem' | 'title'>;

/** The name shown where a file is a label in a list or table. Titles, stems and file names keep the stored name. */
export function displayName(file: { readonly name: string; readonly active: boolean }): string {
  return file.active ? file.name : `${file.name} (Inactive)`;
}

export function reportIdentity(result: SiteResult, options: ReportOptions): ReportIdentity {
  const file = result.files.find((candidate) => candidate.fileId === options.fileId);
  const name =
    options.scope === 'file'
      ? (file?.name ?? 'site')
      : options.redact
        ? '[site]'
        : result.facts.site.name;
  const raw = options.scope === 'file' ? name.replace(/\.js$/i, '') : name;
  return {
    scope: options.scope,
    format: options.format,
    stem: raw.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'site',
    title:
      options.scope === 'file'
        ? `Server logic readiness: ${name}`
        : `Site readiness report: ${name}`,
  };
}

function filenameOf(model: Pick<ReportIdentity, 'scope' | 'format' | 'stem'>): string {
  const suffix = model.scope === 'file' ? 'readiness' : 'site-readiness';
  const extension = model.format === 'markdown' ? 'md' : 'pdf';
  return `${model.stem}-${suffix}.${extension}`;
}

export function reportFileName(model: ReportModel): string {
  return filenameOf(model);
}

export function reportFileNameBeforeBuild(result: SiteResult, options: ReportOptions): string {
  return filenameOf(reportIdentity(result, options));
}
