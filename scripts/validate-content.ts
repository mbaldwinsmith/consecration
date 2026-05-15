import { formatValidationErrors, validateContent } from './content-pipeline';

try {
  const result = await validateContent();

  if (result.errors.length > 0) {
    console.error(formatValidationErrors(result.errors));
    process.exitCode = 1;
  } else {
    console.log('content validation complete');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
