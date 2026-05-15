import { buildContent } from './content-pipeline';

try {
  await buildContent();
  console.log('content build complete');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
