'use client';

import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  callback: () => void;
  description?: string;
}

export function useKeyboardShortcut(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = shortcut.ctrlKey === undefined ? true : (shortcut.ctrlKey ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey));
        const matchesShift = shortcut.shiftKey === undefined ? true : (shortcut.shiftKey === event.shiftKey);
        const matchesAlt = shortcut.altKey === undefined ? true : (shortcut.altKey === event.altKey);
        const matchesMeta = shortcut.metaKey === undefined ? true : (shortcut.metaKey === event.metaKey);

        if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
          // Don't trigger if user is typing in an input, textarea, or contenteditable
          const target = event.target as HTMLElement;
          if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
          ) {
            continue;
          }

          event.preventDefault();
          shortcut.callback();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}