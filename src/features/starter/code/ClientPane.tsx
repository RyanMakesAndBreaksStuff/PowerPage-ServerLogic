import type { ReactElement } from 'react';
import { CopyButton } from '@/components/CopyButton';
import { useStarterSession } from '@/session/useStarterSession';
import { Icon } from '@/components/Icon';
import { PillGroup } from '@/components/PillGroup';
import { Tile } from '@/components/Tile';
import { getRecipe } from '@/services/catalogue/recipes';
import { generateClient } from '@/services/generators/client/client';
import { languageOptions } from '../inputs/starterOptions';
import { CodeEditor } from './CodeEditor';
import './codePanes.css';

/** The read-only client call (AC-2.4, AC-4.1, AC-4.4, AC-4.7 pill). */
export function ClientPane(): ReactElement {
  const { state, dispatch, derived } = useStarterSession();
  // The call shape the download uses, so the pane and the zip's client file match.
  const text = generateClient({
    slug: derived.slug,
    recipe: state.recipe,
    fn: derived.fn,
    method: state.method,
    language: state.language,
  });
  const liquid = state.language === 'liquid';

  return (
    <Tile flush role="region" aria-label="Client call" className="starter-pane">
      <div className="starter-pane__head">
        <span className="starter-pane__swap">
          <Icon name="arrow-swap" />
        </span>
        <span className="starter-pane__title">Client call</span>
        <PillGroup
          label="Client language"
          compact
          options={languageOptions(getRecipe(state.recipe), derived.liquidAllowed)}
          value={state.language}
          onChange={(language) => {
            dispatch({ type: 'setLanguage', language });
          }}
        />
        <span className="starter-pane__spacer" />
        <CopyButton text={text} label="Copy client call" />
      </div>
      <CodeEditor label="Client call code" value={text} syntax={liquid ? 'plain' : 'javascript'} />
      <p className="starter-pane__foot">
        {liquid ? 'Paste into a page or web template' : "Paste into a page's custom JavaScript"}
      </p>
    </Tile>
  );
}
