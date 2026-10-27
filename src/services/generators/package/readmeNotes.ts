import type { RecipeId } from '@/types/recipe';

/** Data only. This file does not import handlers. */
export const README_NOTES: Partial<Record<RecipeId, readonly string[]>> = {
  R3: ['`ExternalApi/BaseUrl` must not contain a query string.'],
  R4: ['The Global Create grant is expected, and Logic Inspector flags it.'],
  R7: [
    'Global access is expected, and Inspector will flag it for review.',
    "`Sites.Selected` is a least-privilege alternative to Learn's `Sites.ReadWrite.All`.",
    'Hold `CLIENT_SECRET` in Azure Key Vault behind an environment variable.',
    'A retry is a new request with a new ActivityId and uploads another ticket. Find orphans by the ActivityId prefix of the file name and delete them manually.',
    'Whether a name collision fails the upload is unverified until the collision probe passes.',
    'An invalid choice value that Dataverse rejects fails after the upload, so the ticket is orphaned.',
    "The optional email step from Learn's sample is not generated.",
  ],
  R9: [
    'The flow must validate its own inputs, because the handler passes the validated body through.',
  ],
};
