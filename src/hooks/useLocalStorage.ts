// src/hooks/useLocalStorage.ts - Improved version with better error handling and type safety
import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing localStorage with React state synchronization
 * Provides automatic JSON serialization/deserialization and error handling
 * 
 * @param key - The localStorage key
 * @param initialValue - The initial value to use if no stored value exists
 * @returns A tuple containing [storedValue, setValue] similar to useState
 */
export function useLocalStorage<T>(
  key: string, 
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      
      // Parse stored json or return initialValue if none exists
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error (e.g., invalid JSON), log it and return initialValue
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  /**
   * Update localStorage and state
   * Supports both direct values and functional updates like useState
   */
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save to state
      setStoredValue(valueToStore);
      
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // Log error but don't throw to avoid breaking the component
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  /**
   * Listen for changes to localStorage from other tabs/windows
   * This allows the hook to stay in sync across browser tabs
   */
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // Only update if the changed key matches our key
      if (event.key === key && event.newValue !== null) {
        try {
          const newValue = JSON.parse(event.newValue);
          setStoredValue(newValue);
        } catch (error) {
          console.error(`Error parsing localStorage change for key "${key}":`, error);
        }
      }
    };

    // Add event listener for storage changes
    window.addEventListener('storage', handleStorageChange);

    // Cleanup function to remove event listener
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue] as const;
}