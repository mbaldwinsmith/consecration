import {
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import type {
  AudioRef,
  CompiledDayPayload,
  ContentIndex,
  ContentIndexEntry,
  ContentMetadata,
  ContentPhase,
  Section,
  SectionType,
} from '../src/domain/content/content-types';

const CONTENT_ROOT = 'content/packs';
const OUTPUT_ROOT = 'dist';
const DAY_INCLUDE_PATTERN = /\{\{recurring:([a-z0-9-]+)\}\}/gi;
const MARKDOWN_ASSET_PATTERN = /!?\[[^\]]*]\(([^)]+)\)/g;

const CONTENT_PHASES = new Set<ContentPhase>([
  'preparation',
  'knowledge-of-self',
  'knowledge-of-mary',
  'knowledge-of-jesus',
  'consecration',
]);

const SECTION_TYPES = new Set<SectionType>([
  'reading',
  'prayer',
  'hymn',
  'litany',
  'reflection',
  'summary',
]);

export interface PipelineOptions {
  readonly contentRoot?: string;
  readonly outputRoot?: string;
}

export interface ValidationResult {
  readonly errors: readonly string[];
}

interface SourceDocument {
  readonly filePath: string;
  readonly id: string;
  readonly metadata: ContentMetadata;
  readonly body: string;
}

interface ConsecrationSource {
  readonly id: string;
  readonly title: string;
  readonly days: readonly DaySource[];
  readonly recurring: ReadonlyMap<string, SourceDocument>;
}

interface DaySource extends SourceDocument {
  readonly day: number;
}

interface FrontMatterParse {
  readonly raw: Record<string, unknown>;
  readonly body: string;
}

export async function buildContent(
  options: PipelineOptions = {},
): Promise<void> {
  const contentRoot = resolveWorkspacePath(options.contentRoot ?? CONTENT_ROOT);
  const outputRoot = resolveWorkspacePath(options.outputRoot ?? OUTPUT_ROOT);
  const sources = await loadConsecrationSources(contentRoot);
  const validation = await validateSources(sources, contentRoot);

  if (validation.errors.length > 0) {
    throw new Error(formatValidationErrors(validation.errors));
  }

  await rm(path.join(outputRoot, 'days'), { recursive: true, force: true });
  await mkdir(path.join(outputRoot, 'days'), { recursive: true });

  const entries: ContentIndexEntry[] = [];

  for (const source of sources) {
    for (const day of source.days) {
      const payload = compileDayPayload(source.id, day, source.recurring);
      const relativePath = `days/${source.id}/${String(day.day)}.json`;
      const absolutePath = path.join(outputRoot, relativePath);
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(
        absolutePath,
        `${JSON.stringify(payload, null, 2)}\n`,
        'utf8',
      );

      entries.push({
        consecrationId: source.id,
        day: day.day,
        title: day.metadata.title,
        phase: day.metadata.phase,
        durationMinutes: payload.content.durationMinutes,
        path: relativePath,
        tags: dedupe(day.metadata.tags),
        summaryKeys: payload.summaryKeys,
      });
    }
  }

  const index: ContentIndex = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    consecrations: sources.map((source) => ({
      id: source.id,
      title: source.title,
      totalDays: source.days.length,
    })),
    days: entries.sort(
      (left, right) =>
        left.consecrationId.localeCompare(right.consecrationId) ||
        left.day - right.day,
    ),
  };

  await writeFile(
    path.join(outputRoot, 'content-index.json'),
    `${JSON.stringify(index, null, 2)}\n`,
    'utf8',
  );
}

export async function validateContent(
  options: PipelineOptions = {},
): Promise<ValidationResult> {
  const contentRoot = resolveWorkspacePath(options.contentRoot ?? CONTENT_ROOT);
  const sources = await loadConsecrationSources(contentRoot);

  return validateSources(sources, contentRoot);
}

export function formatValidationErrors(errors: readonly string[]): string {
  return [
    'Content validation failed:',
    ...errors.map((error) => `- ${error}`),
  ].join('\n');
}

async function loadConsecrationSources(
  contentRoot: string,
): Promise<readonly ConsecrationSource[]> {
  const packNames = await listDirectoryNames(contentRoot);
  const sources: ConsecrationSource[] = [];

  for (const packName of packNames) {
    const packRoot = path.join(contentRoot, packName);
    const dayRoot = path.join(packRoot, 'days');
    const recurringRoot = path.join(packRoot, 'recurring');
    const dayFiles = await listMarkdownFiles(dayRoot);
    const recurringFiles = await listMarkdownFiles(recurringRoot);
    const recurring = new Map<string, SourceDocument>();

    for (const filePath of recurringFiles) {
      const document = await readSourceDocument(
        filePath,
        path.basename(filePath, '.md'),
      );
      recurring.set(document.id, document);
    }

    const days = await Promise.all(
      dayFiles.map(async (filePath) => {
        const day = Number.parseInt(path.basename(filePath, '.md'), 10);
        const document = await readSourceDocument(
          filePath,
          `day-${String(day)}`,
        );

        return { ...document, day };
      }),
    );

    sources.push({
      id: packName,
      title: toTitle(packName),
      recurring,
      days: days.sort((left, right) => left.day - right.day),
    });
  }

  return sources;
}

async function readSourceDocument(
  filePath: string,
  id: string,
): Promise<SourceDocument> {
  const source = await readFile(filePath, 'utf8');
  const parsed = parseFrontMatter(source, filePath);

  return {
    filePath,
    id,
    metadata: coerceMetadata(parsed.raw, filePath),
    body: parsed.body.trim(),
  };
}

async function validateSources(
  sources: readonly ConsecrationSource[],
  contentRoot: string,
): Promise<ValidationResult> {
  const errors: string[] = [];

  if (sources.length === 0) {
    errors.push(`No content packs found in ${contentRoot}.`);
  }

  for (const source of sources) {
    validateDaySequence(source, errors);
    validateDuplicateIds(source, errors);

    for (const day of source.days) {
      validateIncludes(day, source.recurring, errors);
      await validateAssetLinks(day, contentRoot, errors);
    }

    for (const recurring of source.recurring.values()) {
      await validateAssetLinks(recurring, contentRoot, errors);
      validateRecurringGraph(recurring, source.recurring, errors, []);
    }
  }

  return { errors };
}

function validateDaySequence(
  source: ConsecrationSource,
  errors: string[],
): void {
  if (source.days.length === 0) {
    errors.push(`${source.id}: at least one day markdown file is required.`);
    return;
  }

  const seen = new Set<number>();

  for (const day of source.days) {
    if (!Number.isInteger(day.day) || day.day < 1) {
      errors.push(
        `${source.id}: ${day.filePath} must be named with a positive day number, e.g. 1.md.`,
      );
    }

    if (seen.has(day.day)) {
      errors.push(`${source.id}: duplicate day ${String(day.day)}.`);
    }

    seen.add(day.day);
  }

  const maxDay = Math.max(...seen);

  for (let day = 1; day <= maxDay; day += 1) {
    if (!seen.has(day)) {
      errors.push(
        `${source.id}: missing day ${String(day)} between day 1 and day ${String(maxDay)}.`,
      );
    }
  }
}

function validateDuplicateIds(
  source: ConsecrationSource,
  errors: string[],
): void {
  const ids = new Set<string>();

  for (const recurring of source.recurring.values()) {
    if (ids.has(recurring.id)) {
      errors.push(
        `${source.id}: duplicate recurring content id "${recurring.id}".`,
      );
    }

    ids.add(recurring.id);
  }
}

function validateIncludes(
  document: SourceDocument,
  recurring: ReadonlyMap<string, SourceDocument>,
  errors: string[],
): void {
  for (const includeId of findIncludeIds(document.body)) {
    if (!recurring.has(includeId)) {
      errors.push(
        `${document.filePath}: recurring include "${includeId}" does not exist.`,
      );
    }
  }
}

function validateRecurringGraph(
  document: SourceDocument,
  recurring: ReadonlyMap<string, SourceDocument>,
  errors: string[],
  stack: readonly string[],
): void {
  if (stack.includes(document.id)) {
    errors.push(
      `${document.filePath}: circular recurring include detected: ${[...stack, document.id].join(' -> ')}.`,
    );
    return;
  }

  for (const includeId of findIncludeIds(document.body)) {
    const included = recurring.get(includeId);

    if (included === undefined) {
      errors.push(
        `${document.filePath}: recurring include "${includeId}" does not exist.`,
      );
      continue;
    }

    validateRecurringGraph(included, recurring, errors, [
      ...stack,
      document.id,
    ]);
  }
}

async function validateAssetLinks(
  document: SourceDocument,
  contentRoot: string,
  errors: string[],
): Promise<void> {
  const assetLinks = [
    ...findMarkdownAssetLinks(document.body),
    document.metadata.audio?.src,
  ].filter(
    (assetLink): assetLink is string =>
      assetLink !== undefined && shouldValidateLocalAsset(assetLink),
  );

  for (const assetLink of assetLinks) {
    const assetPath = path.resolve(path.dirname(document.filePath), assetLink);

    if (!assetPath.startsWith(contentRoot)) {
      errors.push(
        `${document.filePath}: asset link "${assetLink}" resolves outside content root.`,
      );
      continue;
    }

    await stat(assetPath).catch(() => {
      errors.push(
        `${document.filePath}: asset link "${assetLink}" was not found.`,
      );
    });
  }
}

function compileDayPayload(
  consecrationId: string,
  day: DaySource,
  recurring: ReadonlyMap<string, SourceDocument>,
): CompiledDayPayload {
  const recurringSections: Section[] = [];
  const recurringContentIds: string[] = [];
  const seenRecurringIds = new Set<string>();

  collectRecurringSections(
    day.body,
    recurring,
    seenRecurringIds,
    recurringContentIds,
    recurringSections,
  );

  const primaryBody = day.body.replace(DAY_INCLUDE_PATTERN, '').trim();
  const primarySection = toSection(
    `${consecrationId}-day-${String(day.day)}-primary`,
    day.metadata,
    primaryBody,
  );
  const sections = [primarySection, ...recurringSections];
  const summaryKeys = dedupe([
    ...day.metadata.summaryKeys,
    ...recurringSections.flatMap((section) =>
      section.tags.filter((tag) => tag.startsWith('summary:')),
    ),
  ]);

  return {
    content: {
      consecrationId,
      day: day.day,
      title: day.metadata.title,
      phase: day.metadata.phase,
      author: day.metadata.author,
      durationMinutes: sections.reduce(
        (total, section) => total + estimateSectionMinutes(section),
        0,
      ),
      sections,
    },
    summaryKeys,
    recurringContentIds,
  };
}

function collectRecurringSections(
  body: string,
  recurring: ReadonlyMap<string, SourceDocument>,
  seen: Set<string>,
  recurringContentIds: string[],
  sections: Section[],
): void {
  for (const includeId of findIncludeIds(body)) {
    if (seen.has(includeId)) {
      continue;
    }

    const document = recurring.get(includeId);

    if (document === undefined) {
      continue;
    }

    seen.add(includeId);
    recurringContentIds.push(includeId);
    collectRecurringSections(
      document.body,
      recurring,
      seen,
      recurringContentIds,
      sections,
    );
    sections.push(
      toSection(
        `recurring-${includeId}`,
        document.metadata,
        document.body.replace(DAY_INCLUDE_PATTERN, '').trim(),
      ),
    );
  }
}

function toSection(
  id: string,
  metadata: ContentMetadata,
  body: string,
): Section {
  return {
    id,
    type: metadata.sectionType,
    title: metadata.title,
    html: renderMarkdown(body),
    required: metadata.required,
    tags: dedupe([
      ...metadata.tags,
      ...metadata.summaryKeys.map((key) => `summary:${key}`),
    ]),
    audio: metadata.audio,
  };
}

function estimateSectionMinutes(section: Section): number {
  const text = section.html.replace(/<[^>]+>/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 180));
}

function parseFrontMatter(source: string, filePath: string): FrontMatterParse {
  if (!source.startsWith('---')) {
    throw new Error(`${filePath}: missing front matter block.`);
  }

  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/u.exec(source);

  if (match?.[1] === undefined || match[2] === undefined) {
    throw new Error(
      `${filePath}: front matter must be enclosed by --- markers.`,
    );
  }

  return {
    raw: parseYamlSubset(match[1], filePath),
    body: match[2],
  };
}

function parseYamlSubset(
  source: string,
  filePath: string,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const line of source.split(/\r?\n/u)) {
    const trimmed = line.trim();

    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf(':');

    if (separatorIndex < 1) {
      throw new Error(`${filePath}: invalid front matter line "${line}".`);
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    values[key] = parseScalar(rawValue);
  }

  return values;
}

function parseScalar(value: string): unknown {
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();

    return inner.length === 0
      ? []
      : inner.split(',').map((item) => trimQuotes(item.trim()));
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  const numeric = Number(value);

  if (value.length > 0 && Number.isFinite(numeric)) {
    return numeric;
  }

  return trimQuotes(value);
}

function coerceMetadata(
  raw: Record<string, unknown>,
  filePath: string,
): ContentMetadata {
  const title = requireString(raw, 'title', filePath);
  const phase = requireEnum(raw, 'phase', CONTENT_PHASES, filePath);
  const author = requireString(raw, 'author', filePath);
  const duration = requireNumber(raw, 'duration', filePath);
  const sectionType = requireEnum(raw, 'sectionType', SECTION_TYPES, filePath);
  const tags = requireStringArray(raw, 'tags', filePath);
  const summaryKeys = requireStringArray(raw, 'summaryKeys', filePath);

  return {
    title,
    phase,
    author,
    duration,
    sectionType,
    required: readBoolean(raw.required, true, 'required', filePath),
    tags,
    summaryKeys,
    audio: readAudio(raw.audio, filePath),
  };
}

function requireString(
  raw: Record<string, unknown>,
  key: string,
  filePath: string,
): string {
  const value = raw[key];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(
      `${filePath}: front matter "${key}" must be a non-empty string.`,
    );
  }

  return value.trim();
}

function requireNumber(
  raw: Record<string, unknown>,
  key: string,
  filePath: string,
): number {
  const value = raw[key];

  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(
      `${filePath}: front matter "${key}" must be a positive number.`,
    );
  }

  return value;
}

function requireEnum<T extends string>(
  raw: Record<string, unknown>,
  key: string,
  allowed: ReadonlySet<T>,
  filePath: string,
): T {
  const value = requireString(raw, key, filePath);

  if (!allowed.has(value as T)) {
    throw new Error(
      `${filePath}: front matter "${key}" must be one of ${[...allowed].join(', ')}.`,
    );
  }

  return value as T;
}

function requireStringArray(
  raw: Record<string, unknown>,
  key: string,
  filePath: string,
): readonly string[] {
  const value = raw[key];

  if (!isNonEmptyStringArray(value)) {
    throw new Error(
      `${filePath}: front matter "${key}" must be an array of non-empty strings.`,
    );
  }

  return value.map((item) => item.trim());
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string' && item.trim().length > 0)
  );
}

function readBoolean(
  value: unknown,
  fallback: boolean,
  key: string,
  filePath: string,
): boolean {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'boolean') {
    throw new Error(
      `${filePath}: front matter "${key}" must be true or false.`,
    );
  }

  return value;
}

function readAudio(value: unknown, filePath: string): AudioRef | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(
      `${filePath}: front matter "audio" must be a non-empty asset path when present.`,
    );
  }

  return { src: value.trim() };
}

function renderMarkdown(markdown: string): string {
  const blocks = markdown
    .split(/\n{2,}/u)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map(renderBlock).join('\n');
}

function renderBlock(block: string): string {
  if (block.startsWith('### ')) {
    return `<h3>${escapeHtml(block.slice(4))}</h3>`;
  }

  if (block.startsWith('## ')) {
    return `<h2>${escapeHtml(block.slice(3))}</h2>`;
  }

  if (block.startsWith('# ')) {
    return `<h1>${escapeHtml(block.slice(2))}</h1>`;
  }

  if (block.split(/\r?\n/u).every((line) => line.trim().startsWith('- '))) {
    const items = block
      .split(/\r?\n/u)
      .map((line) => `<li>${escapeHtml(line.trim().slice(2))}</li>`)
      .join('');

    return `<ul>${items}</ul>`;
  }

  return `<p>${escapeHtml(block).replace(/\r?\n/gu, '<br>')}</p>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function findIncludeIds(body: string): readonly string[] {
  return [...body.matchAll(DAY_INCLUDE_PATTERN)]
    .map((match) => match[1])
    .filter((id): id is string => id !== undefined);
}

function findMarkdownAssetLinks(body: string): readonly string[] {
  return [...body.matchAll(MARKDOWN_ASSET_PATTERN)]
    .map((match) => match[1])
    .filter((id): id is string => id !== undefined);
}

function shouldValidateLocalAsset(assetLink: string): boolean {
  return !/^(https?:|mailto:|#|\/)/u.test(assetLink);
}

async function listDirectoryNames(root: string): Promise<readonly string[]> {
  const entries = await readdir(root, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

async function listMarkdownFiles(root: string): Promise<readonly string[]> {
  const entries = await readdir(root, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(root, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

function resolveWorkspacePath(relativePath: string): string {
  return path.resolve(process.cwd(), relativePath);
}

function trimQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function toTitle(value: string): string {
  if (value === 'montfort') {
    return 'St. Louis de Montfort';
  }

  return value
    .split(/[-_]/u)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function dedupe(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}
