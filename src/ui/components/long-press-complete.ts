export interface LongPressCompleteOptions {
  readonly label?: string;
  readonly holdMs?: number;
  readonly onComplete: () => void;
  readonly onUndo?: () => void;
}

export function createLongPressCompleteButton(options: LongPressCompleteOptions): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'completion-control';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'primary-action long-press-complete';
  button.textContent = options.label ?? 'Hold to complete';
  button.ariaLabel = 'Hold to mark day complete';

  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.textContent = 'Hold briefly to mark complete.';

  const undo = document.createElement('button');
  undo.type = 'button';
  undo.textContent = 'Undo';
  undo.hidden = true;
  undo.addEventListener('click', () => {
    undo.hidden = true;
    button.disabled = false;
    status.textContent = 'Completion undone.';
    options.onUndo?.();
  });

  const holdMs = options.holdMs ?? 650;
  let timer: number | undefined;

  const clearTimer = (): void => {
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
  };

  const complete = (): void => {
    clearTimer();
    button.disabled = true;
    undo.hidden = false;
    status.textContent = 'Day marked complete.';
    options.onComplete();
  };

  button.addEventListener('pointerdown', () => {
    clearTimer();
    status.textContent = 'Keep holding to complete.';
    timer = window.setTimeout(complete, holdMs);
  });
  button.addEventListener('pointerup', () => {
    if (timer !== undefined) {
      clearTimer();
      status.textContent = 'Hold a little longer to complete.';
    }
  });
  button.addEventListener('pointerleave', clearTimer);
  button.addEventListener('pointercancel', clearTimer);
  button.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      complete();
    }
  });

  wrapper.append(button, status, undo);

  return wrapper;
}
