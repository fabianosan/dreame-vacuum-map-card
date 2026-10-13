import { describe, expect, it } from 'vitest';
import { classifyDockStatus, DOCK_TASKS, shouldOpenDockPopup } from '../dockPopup';

describe('shouldOpenDockPopup', () => {
  it.each(['idle', 'maintenance', 'error', 'other'] as const)('opens when docked during %s', (phase) => {
    expect(shouldOpenDockPopup(phase, 'docked')).toBe(true);
  });

  it('sends the robot home when it is stopped away from the dock', () => {
    expect(shouldOpenDockPopup('idle', 'idle')).toBe(false);
  });

  it('sends the robot home while it is returning', () => {
    expect(shouldOpenDockPopup('returning', 'returning')).toBe(false);
  });

  it.each(['cleaning', 'paused'] as const)('keeps the dock service path during %s', (phase) => {
    expect(shouldOpenDockPopup(phase, phase)).toBe(false);
    expect(shouldOpenDockPopup(phase, 'docked')).toBe(false);
  });

  it('does not open without a vacuum state', () => {
    expect(shouldOpenDockPopup('idle', undefined)).toBe(false);
  });
});

describe('classifyDockStatus', () => {
  it('warns for low clean water only', () => {
    expect(classifyDockStatus('Low water', true)).toBe('warning');
    expect(classifyDockStatus('Low water')).toBe('good');
  });

  it.each(['empty', 'not installed', 'max water level', 'error'])('marks %s as bad', (state) => {
    expect(classifyDockStatus(state)).toBe('bad');
  });

  it.each([undefined, null, '', 'unknown', 'unavailable'])('marks %s as unknown', (state) => {
    expect(classifyDockStatus(state)).toBe('unknown');
  });

  it('supports boolean and numeric states', () => {
    expect(classifyDockStatus(true)).toBe('good');
    expect(classifyDockStatus(false)).toBe('bad');
    expect(classifyDockStatus(1)).toBe('good');
    expect(classifyDockStatus(0)).toBe('bad');
  });
});

describe('dock tasks', () => {
  it('uses current registry translation keys', () => {
    expect(DOCK_TASKS.map((task) => task.key)).toEqual(['start_auto_empty', 'self_clean', 'manual_drying']);
  });
});
