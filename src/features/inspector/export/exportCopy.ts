/** Toast and reason texts for the export job (P5.7). The session store and the Export dialog import them. */

/** Info toast when the results change under an open dialog while idle or building. A saving job is not cancelled (AC-9.8). */
export const EXPORT_CANCELLED_TITLE = 'Results changed, so the export was cancelled.';
export const EXPORT_CANCELLED_BODY = '';

/** Error toast body for any failure before the save starts. Technical detail goes to the console only. */
export const BUILD_FAILED_BODY = "The report couldn't be built.";
/** Error toast body for any failure once the save has started, host errors included. */
export const SAVE_FAILED_BODY = "The file couldn't be written.";

/** Warning toast, shown once the build returns, when it took longer than the threshold (E-11 B, N4). */
export const EXPORT_SLOW_TITLE = 'The report is taking longer than expected.';
export const EXPORT_SLOW_BODY =
  'Building has run for more than 5 seconds. It will finish and the save dialog will open.';

/** Reason on every dialog control while a job is building or saving (Sub-slice D). */
export const EXPORT_BUSY_REASON = 'Wait for the export to finish, or close this dialog.';
