import '../styles/tokens.css';
import '../styles/theme.css';
import { createAppShell } from './shell';
import { getSchemaVersion } from './schema';

const mount = document.querySelector<HTMLElement>('#app');

if (mount === null) {
  throw new Error('App mount element #app was not found.');
}

mount.replaceChildren(createAppShell(getSchemaVersion()));
