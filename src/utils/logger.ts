const formatError = (error: unknown) =>
  error instanceof Error ? (error.stack ?? error.message) : String(error);

export const logger = {
  error: (message: string, error?: unknown) => {
    const details = error === undefined ? "" : `\n${formatError(error)}`;
    process.stderr.write(`[error] ${message}${details}\n`);
  },
};
