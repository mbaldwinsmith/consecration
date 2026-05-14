export type PluginType = 'content-pack' | 'enhancement' | 'ui-mode';

export type PluginCapability =
  | 'content:days'
  | 'content:prayers'
  | 'audio:optional'
  | 'bible:optional'
  | 'mode:policy'
  | 'reflections:prompts';

export interface PluginManifest {
  readonly id: string;
  readonly type: PluginType;
  readonly version: string;
  readonly displayName: string;
  readonly capabilities: readonly PluginCapability[];
  readonly entry: string;
  readonly compatibility: {
    readonly app: string;
  };
}
