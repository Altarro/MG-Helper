import { describe, expect, it } from 'vitest';
import {
  formatPolishCharacterCount,
  formatPolishClueCount,
  formatPolishCount,
  formatPolishFrontCount,
  formatPolishThreadCount,
  formatPolishThreatCount,
} from '@shared/utils/polishPlural';

describe('formatPolishCount', () => {
  it('uses one / few / many forms', () => {
    expect(formatPolishCount(1, 'kot', 'koty', 'kotów')).toBe('1 kot');
    expect(formatPolishCount(3, 'kot', 'koty', 'kotów')).toBe('3 koty');
    expect(formatPolishCount(12, 'kot', 'koty', 'kotów')).toBe('12 kotów');
    expect(formatPolishCount(22, 'kot', 'koty', 'kotów')).toBe('22 koty');
  });
});

describe('formatPolishFrontCount', () => {
  it('uses correct forms', () => {
    expect(formatPolishFrontCount(1)).toBe('1 front');
    expect(formatPolishFrontCount(2)).toBe('2 fronty');
    expect(formatPolishFrontCount(12)).toBe('12 frontów');
    expect(formatPolishFrontCount(22)).toBe('22 fronty');
  });
});

describe('formatPolishThreatCount', () => {
  it('uses correct forms', () => {
    expect(formatPolishThreatCount(1)).toBe('1 zagrożenie');
    expect(formatPolishThreatCount(2)).toBe('2 zagrożenia');
    expect(formatPolishThreatCount(12)).toBe('12 zagrożeń');
    expect(formatPolishThreatCount(22)).toBe('22 zagrożenia');
  });
});

describe('formatPolishThreadCount', () => {
  it('uses correct forms', () => {
    expect(formatPolishThreadCount(1)).toBe('1 wątek');
    expect(formatPolishThreadCount(4)).toBe('4 wątki');
    expect(formatPolishThreadCount(11)).toBe('11 wątków');
  });
});

describe('formatPolishClueCount', () => {
  it('uses correct forms', () => {
    expect(formatPolishClueCount(1)).toBe('1 wskazówka');
    expect(formatPolishClueCount(3)).toBe('3 wskazówki');
    expect(formatPolishClueCount(15)).toBe('15 wskazówek');
  });
});

describe('formatPolishCharacterCount', () => {
  it('uses correct forms', () => {
    expect(formatPolishCharacterCount(1)).toBe('1 postać');
    expect(formatPolishCharacterCount(2)).toBe('2 postacie');
    expect(formatPolishCharacterCount(5)).toBe('5 postaci');
  });
});
