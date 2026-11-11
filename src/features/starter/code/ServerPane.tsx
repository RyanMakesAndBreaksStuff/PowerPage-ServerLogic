import type { ReactElement } from 'react';
import { useStarterSession } from '@/session/useStarterSession';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { Tile } from '@/components/Tile';
import type { CheckSeverity } from '@/lib/code-analysis/codeAnalysis.types';
import { LIQUID_SERVER_NOTE } from '@/services/generators/client/client';
import { generateHandler } from '@/services/generators/handlers';
import { CodeEditor } from './CodeEditor';
import { CopyButton } from '@/components/CopyButton';
import './codePanes.css';

const SEVERITY = {
  blocked: 'Blocked',
  'may-be-rejected': 'May be rejected',
} as const satisfies Record<CheckSeverity, string>;
const NO_LINES: readonly number[] = [];

/** The editable server handler (AC-4.2, AC-4.3, AC-4.7 note, AC-4.10, AC-5.2). */
export function ServerPane(): ReactElement {
  const { state, dispatch, derived } = useStarterSession();
  const { hits, parseFailed } = derived.checks;
  // Highlight lines are positions in the generated text, so they show only while it is unedited.
  const highlightLines = derived.edited ? NO_LINES : generateHandler(state.recipe).highlightLines;

  return (
    <Tile flush role="region" aria-label="Server handler" className="starter-pane">
      <div className="starter-pane__head">
        <span className="ui-mono starter-pane__title">{derived.slug}.js</span>
        <Pill tone="server" compact>
          Server
        </Pill>
        <span className="starter-pane__spacer" />
        <CopyButton text={state.serverText} label="Copy server code" />
      </div>
      <CodeEditor
        label="Server code"
        value={state.serverText}
        syntax="javascript"
        cursor={state.cursor}
        highlightLines={highlightLines}
        flagLines={hits.map((hit) => hit.line)}
        onEdit={(text, cursor) => {
          dispatch({ type: 'editServer', text, cursor });
        }}
        onCursor={(cursor) => {
          dispatch({ type: 'setCursor', cursor });
        }}
      />
      {hits.length > 0 || parseFailed ? (
        <ul className="starter-pane__flags" aria-label="Browser check findings">
          {hits.map((hit) => (
            <li key={`${String(hit.line)}:${hit.pattern}:${hit.severity}`}>
              <Icon name="important" size={12} />
              Line {hit.line}: {hit.pattern} ({SEVERITY[hit.severity]})
            </li>
          ))}
          {parseFailed ? (
            <li>
              <Icon name="important" size={12} />
              Couldn&apos;t parse this code
            </li>
          ) : null}
        </ul>
      ) : null}
      {state.language === 'liquid' ? (
        <p className="starter-pane__note">{LIQUID_SERVER_NOTE}</p>
      ) : null}
      <p className="starter-pane__foot">Runs on Power Pages with the caller&apos;s permissions</p>
    </Tile>
  );
}
