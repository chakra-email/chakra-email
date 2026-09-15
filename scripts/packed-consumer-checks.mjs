export function assertPreviewBinaryMetadata(
  { help, version },
  expectedVersion,
) {
  if (typeof expectedVersion !== 'string' || expectedVersion.length === 0) {
    throw new Error('Packed preview package is missing its version metadata.');
  }
  if (
    !help.includes('Chakra Email Preview') ||
    version.trim() !== expectedVersion
  ) {
    throw new Error(
      `Packed preview binary metadata check failed: ${JSON.stringify({
        help,
        version,
        expectedVersion,
      })}`,
    );
  }
}
