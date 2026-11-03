/** Toast and reason texts for the export job (P5.7). The session store and the Export dialog import them. */

/** Info toast when the results change under an open dialog (idle, building or saving). */
export const EXPORT_CANCELLED_TITLE = 'Results changed, so the export was cancelled.';
export const EXPORT_CANCELLED_BODY = '';

/** Error toast body for anything other than a host error thrown before the save starts. */
export const BUILD_FAILED_BODY = "The report couldn't be built.";
/** Error toast body for anything other than a host error thrown once the save has started. */
export const SAVE_FAILED_BODY = "The file couldn't be written.";

/** Warning toast when a build is still running at the watchdog (E-11 B). */
export const EXPORT_SLOW_TITLE = 'The report is taking longer than expected.';
export const EXPORT_SLOW_BODY =
  'Building has run for more than 5 seconds. It will finish and the save dialog will open.';

/** Reason on every dialog control while a job is building or saving (Sub-slice D). */
export const EXPORT_BUSY_REASON = 'Wait for the export to finish, or close this dialog.';
