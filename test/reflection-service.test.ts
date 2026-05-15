import { describe, expect, it } from 'vitest';
import { ReflectionService } from '../src/domain/reflections/reflection-service';
import { LocalStorageAdapter } from '../src/infra/storage/local-storage-adapter';
import type { ReflectionEntry } from '../src/types';

describe('reflection service', () => {
  it('persists, updates, lists, and clears optional reflections', async () => {
    const service = new ReflectionService(
      new LocalStorageAdapter<ReflectionEntry>('test.reflections'),
    );

    const saved = await service.saveReflection({
      consecrationId: 'montfort',
      day: 1,
      text: '  A simple note.  ',
      now: new Date('2026-05-15T09:00:00.000Z'),
    });
    const updated = await service.saveReflection({
      consecrationId: 'montfort',
      day: 1,
      text: 'A revised note.',
      now: new Date('2026-05-16T09:00:00.000Z'),
    });

    expect(saved?.text).toBe('A simple note.');
    expect(updated?.createdAt).toBe('2026-05-15T09:00:00.000Z');
    expect(updated?.updatedAt).toBe('2026-05-16T09:00:00.000Z');
    await expect(service.listReflections('montfort')).resolves.toHaveLength(1);

    await service.saveReflection({
      consecrationId: 'montfort',
      day: 1,
      text: '',
    });

    await expect(service.getReflection('montfort', 1)).resolves.toBeUndefined();
  });
});
