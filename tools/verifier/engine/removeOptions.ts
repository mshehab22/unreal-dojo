// Removal settings for the verify workspace that ride out an editor or scanner still holding a file on Windows.

/** `rm` options: recursive, missing is fine, five retries 200 ms apart. */
export const REMOVE_OPTIONS = { recursive: true, force: true, maxRetries: 5, retryDelay: 200 } as const;
