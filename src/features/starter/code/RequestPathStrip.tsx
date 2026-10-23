import type { ReactElement } from 'react';
import { useStarterSession } from '@/app/starter-session/useStarterSession';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { Tile } from '@/components/Tile';
import { requestPathSteps } from '@/services/generators/client/client';
import './codePanes.css';

/** The request path strip (AC-4.8): steps from Phase 10's requestPathSteps, the endpoint emphasised. */
export function RequestPathStrip(): ReactElement {
  const { state, derived } = useStarterSession();
  const steps = requestPathSteps(state.language, derived.slug, derived.fn);
  return (
    <Tile role="region" aria-label="Request path" className="starter-strip">
      <ol className="starter-strip__steps">
        {steps.map((step, index) => (
          <li key={step.label} className="starter-strip__step">
            {index > 0 ? <Icon name="arrow-right" /> : null}
            <span className="starter-strip__item">
              <span className="starter-strip__label">{step.label}</span>{' '}
              <Pill
                mono
                compact
                tone={step.label === 'Endpoint' ? 'ok' : 'neutral'}
                title={step.value}
                className="starter-strip__value"
              >
                {step.value}
              </Pill>
            </span>
          </li>
        ))}
      </ol>
    </Tile>
  );
}
