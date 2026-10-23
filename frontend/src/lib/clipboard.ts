/**
 * Clipboard utility — delegates to platform abstraction.
 * This module exists for backward compatibility; new code should import
 * from '../platform' directly.
 */
import { platformClipboard } from '../platform';

export const copyToClipboard = platformClipboard.copy;
