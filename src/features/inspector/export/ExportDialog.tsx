import type { ReactElement } from 'react';
import type { ExportJob } from '@/types/inspectorSession';
import { useInspector } from '@/session/useInspector';
import { Button } from '@/components/Button';
import { Checkbox } from '@/components/Checkbox';
import { Modal } from '@/components/Modal';
import { PillGroup } from '@/components/PillGroup';
import type { ReportFormat, ReportScope } from '@/types/report';
import { EXPORT_BUSY_REASON } from './exportCopy';
import './export.css';

const SELECT_FILE_REASON = 'Select a file first';
const STATUS_TEXT = {
  idle: '',
  building: 'Building report…',
  saving: 'Saving report…',
} as const satisfies Record<ExportJob['phase'], string>;

/**
 * The Export report dialog (AC-9.1): a view of the store's export job. Every change goes through the session
 * actions; Esc, Cancel and the close button always close it, and a running job finishes in the background
 * (E-07 B). Entry focus is Modal's: the checked Report radio.
 */
export function ExportDialog({ job }: { job: ExportJob }): ReactElement {
  const session = useInspector();
  const { options, phase } = job;
  const idle = phase === 'idle';
  const busyReason = idle ? null : EXPORT_BUSY_REASON;
  const { site } = job.result.facts;
  const selected = job.result.files.find((candidate) => candidate.fileId === options.fileId);
  const context = selected === undefined ? site.name : `${site.name} · ${selected.name}`;

  return (
    <Modal
      open
      title="Export report"
      onClose={session.closeExport}
      footer={
        <>
          <Button onClick={session.closeExport}>Cancel</Button>
          <Button variant="primary" busy={!idle} onClick={session.submitExport}>
            {options.format === 'markdown' ? 'Export Markdown' : 'Export PDF'}
          </Button>
        </>
      }
    >
      <div className="export-dialog">
        <p className="export-dialog__context">{context}</p>
        <PillGroup<ReportScope>
          label="Report"
          value={options.scope}
          options={[
            {
              value: 'file',
              label: 'This file',
              disabledReason: busyReason ?? (options.fileId === null ? SELECT_FILE_REASON : null),
            },
            { value: 'site', label: 'Site summary', disabledReason: busyReason },
          ]}
          onChange={(scope) => {
            session.setExportOptions({ scope });
          }}
        />
        <PillGroup<ReportFormat>
          label="Format"
          value={options.format}
          options={[
            { value: 'markdown', label: 'Markdown', disabledReason: busyReason },
            { value: 'pdf', label: 'PDF', disabledReason: busyReason },
          ]}
          onChange={(format) => {
            session.setExportOptions({ format });
          }}
        />
        <div className="export-dialog__includes">
          <Checkbox
            label="Questions to consider"
            checked={options.questions}
            disabledReason={busyReason}
            onChange={(questions) => {
              session.setExportOptions({ questions });
            }}
          />
          <Checkbox
            label="Configuration snapshot"
            checked={options.snapshot}
            disabledReason={busyReason}
            onChange={(snapshot) => {
              session.setExportOptions({ snapshot });
            }}
          />
          <Checkbox
            label="Redact environment and site names and URLs"
            checked={options.redact}
            disabledReason={busyReason}
            onChange={(redact) => {
              session.setExportOptions({ redact });
            }}
          />
        </div>
        <p role="status" className="export-dialog__status">
          {STATUS_TEXT[phase]}
        </p>
      </div>
    </Modal>
  );
}
