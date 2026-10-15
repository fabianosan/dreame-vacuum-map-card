import { describe, expect, it } from 'vitest';
import { isRobotBusy } from '@/constants';
import { deriveControls, derivePhase, resolveCleaningMode } from '../useVacuumMachineState';

describe('derivePhase', () => {
  it('uses the state sensor when it reports a known state', () => {
    expect(derivePhase('sweeping', 'docked')).toBe('cleaning');
  });

  it.each([
    ['cleaning', 'cleaning'],
    ['docked', 'idle'],
  ] as const)('falls back to the vacuum state %s while the sensor is unknown', (vacuumState, phase) => {
    expect(derivePhase('unknown', vacuumState)).toBe(phase);
  });

  it.each([
    ['cleaning', 'cleaning'],
    ['paused', 'paused'],
    ['returning', 'returning'],
  ] as const)('lets an active vacuum state %s override an "other" sensor state', (vacuumState, phase) => {
    expect(derivePhase('shortcut', vacuumState)).toBe(phase);
  });

  it.each(['docked', 'idle'])('keeps "other" for a shortcut sensor state while the vacuum is %s', (vacuumState) => {
    expect(derivePhase('shortcut', vacuumState)).toBe('other');
  });

  it('does not let the vacuum state override a mapped non-other sensor state', () => {
    expect(derivePhase('washing', 'cleaning')).toBe('maintenance');
    expect(derivePhase('charging', 'cleaning')).toBe('idle');
  });

  it('falls back to the vacuum state while the sensor is unavailable', () => {
    expect(derivePhase('unavailable', 'returning')).toBe('returning');
  });
});

describe('isRobotBusy', () => {
  it('keeps room selection hidden through an active job', () => {
    expect(isRobotBusy('cleaning', 'cleaning')).toBe(true);
    expect(isRobotBusy('paused', 'paused')).toBe(true);
    expect(isRobotBusy('returning', 'returning')).toBe(true);
    expect(isRobotBusy('idle', 'cleaning')).toBe(true);
    expect(isRobotBusy('other', 'cleaning')).toBe(true);
    expect(isRobotBusy('maintenance', 'cleaning')).toBe(true);
  });

  it('allows room selection when the robot is idle', () => {
    expect(isRobotBusy('idle', 'docked')).toBe(false);
    expect(isRobotBusy('idle', 'idle')).toBe(false);
  });

  it.each(['maintenance', 'other', 'error'] as const)('allows room selection at the dock during %s', (phase) => {
    expect(isRobotBusy(phase, 'docked')).toBe(false);
  });
});

describe('resolveCleaningMode', () => {
  it('uses the select when it has a value', () => {
    expect(resolveCleaningMode('Sweeping', 'Mopping')).toBe('Sweeping');
  });

  it('uses the vacuum attribute only when the select has no value', () => {
    expect(resolveCleaningMode(null, 'Mopping')).toBe('Mopping');
    expect(resolveCleaningMode('', 'Mopping')).toBe('Mopping');
  });

  it('is empty when neither source has a value', () => {
    expect(resolveCleaningMode(null, undefined)).toBe('');
  });
});

describe('deriveControls', () => {
  it.each(['Mopping', 'mopping'])('classifies %s as mopping-only', (cleaningMode) => {
    const controls = deriveControls('idle', cleaningMode, false);

    expect(controls.canChangeSuctionPower).toBe(false);
    expect(controls.canChangeWetness).toBe(true);
  });

  it.each(['Sweeping', 'sweeping'])('classifies %s as sweeping', (cleaningMode) => {
    const controls = deriveControls('idle', cleaningMode, false);

    expect(controls.canChangeWetness).toBe(false);
    expect(controls.canToggleMaxPower).toBe(true);
  });

  it.each(['Mopping after sweeping', 'mopping_after_sweeping', 'mopping-after-sweeping'])(
    'classifies %s as mopping after sweeping',
    (cleaningMode) => {
      const controls = deriveControls('cleaning', cleaningMode, false);

      expect(controls.canChangeCleaningMode).toBe(false);
      expect(controls.canToggleMaxPower).toBe(true);
    }
  );

  it('does not impose restrictions for an unknown model-specific mode', () => {
    const controls = deriveControls('idle', 'model_specific_mode', false);

    expect(controls.canChangeSuctionPower).toBe(true);
    expect(controls.canChangeWetness).toBe(true);
    expect(controls.canToggleMaxPower).toBe(false);
  });
});
