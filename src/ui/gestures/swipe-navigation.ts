export interface SwipeNavigationOptions {
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly thresholdPixels?: number;
}

export function attachSwipeNavigation(element: HTMLElement, options: SwipeNavigationOptions): () => void {
  const threshold = options.thresholdPixels ?? 50;
  let startX: number | undefined;

  const onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse') {
      return;
    }

    startX = event.clientX;
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (startX === undefined) {
      return;
    }

    const delta = event.clientX - startX;
    startX = undefined;

    if (Math.abs(delta) < threshold) {
      return;
    }

    if (delta > 0) {
      options.onPrevious();
    } else {
      options.onNext();
    }
  };

  const onPointerCancel = (): void => {
    startX = undefined;
  };

  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointercancel', onPointerCancel);

  return () => {
    element.removeEventListener('pointerdown', onPointerDown);
    element.removeEventListener('pointerup', onPointerUp);
    element.removeEventListener('pointercancel', onPointerCancel);
  };
}
