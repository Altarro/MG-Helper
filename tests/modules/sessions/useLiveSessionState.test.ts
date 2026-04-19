import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useLiveSessionState,
  clearLiveSessionState,
  setLiveSessionMarker,
  getLiveSessionMarker,
  clearLiveSessionMarker,
} from '@modules/sessions/hooks/useLiveSessionState';

const SESSION_ID = 'test-session-lru';

function key(id = SESSION_ID) {
  return `session-live-${id}`;
}

describe('useLiveSessionState', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('starts with empty openCardIds and null location', () => {
    const { result } = renderHook(() => useLiveSessionState(SESSION_ID));
    expect(result.current.openCardIds).toEqual([]);
    expect(result.current.currentLocationId).toBeNull();
  });

  it('openCard adds id at front of list', () => {
    const { result } = renderHook(() => useLiveSessionState(SESSION_ID));
    act(() => result.current.openCard('a'));
    act(() => result.current.openCard('b'));
    expect(result.current.openCardIds).toEqual(['b', 'a']);
  });

  it('LRU: opening a 5th card drops the oldest (max 4)', () => {
    const { result } = renderHook(() => useLiveSessionState(SESSION_ID));
    act(() => result.current.openCard('1'));
    act(() => result.current.openCard('2'));
    act(() => result.current.openCard('3'));
    act(() => result.current.openCard('4'));
    act(() => result.current.openCard('5'));
    expect(result.current.openCardIds).toHaveLength(4);
    expect(result.current.openCardIds).toEqual(['5', '4', '3', '2']);
    expect(result.current.openCardIds).not.toContain('1');
  });

  it('reopening an existing card moves it to front without duplicating', () => {
    const { result } = renderHook(() => useLiveSessionState(SESSION_ID));
    act(() => result.current.openCard('a'));
    act(() => result.current.openCard('b'));
    act(() => result.current.openCard('c'));
    act(() => result.current.openCard('a')); // re-open 'a'
    expect(result.current.openCardIds).toEqual(['a', 'c', 'b']);
  });

  it('closeCard removes the id', () => {
    const { result } = renderHook(() => useLiveSessionState(SESSION_ID));
    act(() => result.current.openCard('a'));
    act(() => result.current.openCard('b'));
    act(() => result.current.closeCard('a'));
    expect(result.current.openCardIds).toEqual(['b']);
  });

  it('persists state to sessionStorage', () => {
    const { result } = renderHook(() => useLiveSessionState(SESSION_ID));
    act(() => result.current.setCurrentLocationId('loc-1'));
    act(() => result.current.openCard('card-1'));
    const stored = JSON.parse(sessionStorage.getItem(key()) ?? '{}');
    expect(stored.currentLocationId).toBe('loc-1');
    expect(stored.openCardIds).toContain('card-1');
  });

  it('recovers persisted state on re-initialization', () => {
    // Pre-seed sessionStorage
    sessionStorage.setItem(
      key(),
      JSON.stringify({ currentLocationId: 'loc-pre', openCardIds: ['x', 'y'] }),
    );
    const { result } = renderHook(() => useLiveSessionState(SESSION_ID));
    expect(result.current.currentLocationId).toBe('loc-pre');
    expect(result.current.openCardIds).toEqual(['x', 'y']);
  });

  it('falls back to empty state when sessionStorage contains invalid JSON', () => {
    sessionStorage.setItem(key(), '{not-json');
    const { result } = renderHook(() => useLiveSessionState(SESSION_ID));
    expect(result.current.currentLocationId).toBeNull();
    expect(result.current.openCardIds).toEqual([]);
  });

  it('normalizes malformed persisted state shapes', () => {
    sessionStorage.setItem(
      key(),
      JSON.stringify({ currentLocationId: 123, openCardIds: ['a', 5, 'b', 'c', 'd', 'e'] }),
    );
    const { result } = renderHook(() => useLiveSessionState(SESSION_ID));
    expect(result.current.currentLocationId).toBeNull();
    expect(result.current.openCardIds).toEqual(['a', 'b', 'c', 'd']);
  });

  it('clearLiveSessionState removes persisted data for a session', () => {
    sessionStorage.setItem(key(), JSON.stringify({ currentLocationId: 'loc-1', openCardIds: ['a'] }));
    clearLiveSessionState(SESSION_ID);
    expect(sessionStorage.getItem(key())).toBeNull();
  });
});

describe('live session marker (localStorage)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('setLiveSessionMarker stores marker in localStorage', () => {
    setLiveSessionMarker({ sessionId: 's1', sessionName: 'Sesja 1', isPaused: false, campaignId: 'camp-1' });
    const marker = getLiveSessionMarker();
    expect(marker).not.toBeNull();
    expect(marker?.sessionId).toBe('s1');
    expect(marker?.sessionName).toBe('Sesja 1');
    expect(marker?.isPaused).toBe(false);
    expect(marker?.campaignId).toBe('camp-1');
  });

  it('clearLiveSessionMarker removes the marker', () => {
    setLiveSessionMarker({ sessionId: 's2', sessionName: 'Sesja 2', isPaused: false });
    clearLiveSessionMarker();
    expect(getLiveSessionMarker()).toBeNull();
  });

  it('getLiveSessionMarker returns null when nothing stored', () => {
    expect(getLiveSessionMarker()).toBeNull();
  });

  it('ignores malformed localStorage markers', () => {
    localStorage.setItem('mg-live-session', JSON.stringify({ sessionId: 1, sessionName: null }));
    expect(getLiveSessionMarker()).toBeNull();
  });
});
