// The time budget for tests that write to the real disk.

/** Each real save fsyncs the file and flushes the folder, which can take seconds on slow CI disks (macOS runners), so real-disk tests get more than the default 5 s. */
export const REAL_DISK_TIMEOUT_MS = 30_000;
