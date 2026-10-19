import type {
  StarterDerived,
  StarterPackageInput,
} from '@/app/starter-session/starterSession.types';

/** `validation` stays boolean so a test can cover every readiness combination. Session derivation fixes it to true. */
type ReadinessSource = {
  readiness: { browser: boolean; validation: boolean; permissions: boolean };
  ready: StarterDerived['ready'];
};

const PERMISSIONS_DONE =
  'Permissions: marked reviewed in Logic Starter; not checked against any environment';
const PERMISSIONS_OPEN =
  'Permissions: not marked reviewed in Logic Starter; not checked against any environment';

function mark(done: boolean, item: string): string {
  return done ? `✓ ${item}` : `! Needs attention: ${item}`;
}

export function readinessBlock(derived: ReadinessSource): string {
  const { browser, validation, permissions } = derived.readiness;
  return [
    `${String(derived.ready)}/3 ready`,
    '',
    mark(browser, 'Browser checks'),
    mark(validation, 'Validation'),
    mark(permissions, permissions ? PERMISSIONS_DONE : PERMISSIONS_OPEN),
  ].join('\n');
}

/** Task 1 placeholder. Task 2 replaces this with the full README. */
export function buildReadme(i: StarterPackageInput): string {
  return `# ${i.derived.slug}\n\n${readinessBlock(i.derived)}\n`;
}
