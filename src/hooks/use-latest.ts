import { useRef } from 'react';

/**
 * Hook that returns a mutable ref object whose .current property is always set to the most recent value passed to it.
 * This is useful for accessing the latest value of a prop or state inside an effect or callback.
 * Unlike useState, this doesn't cause re-renders when the value changes.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}