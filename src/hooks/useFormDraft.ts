import { useEffect, useState, useCallback, useRef } from "react";
import { UseFormReturn, FieldValues } from "react-hook-form";

interface UseFormDraftOptions<T extends FieldValues> {
  key: string;
  form: UseFormReturn<T>;
  enabled?: boolean;
}

/**
 * A hook to automatically save form state to LocalStorage and provide restoration logic.
 * Designed for professional "Operations Hub" applications where data loss prevention is critical.
 */
export function useFormDraft<T extends FieldValues>({
  key,
  form,
  enabled = true,
}: UseFormDraftOptions<T>) {
  const [hasDraft, setHasDraft] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for existing draft on mount or key change
  useEffect(() => {
    if (!enabled) return;
    const draft = localStorage.getItem(key);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        // Only consider it a draft if it has actual data 
        // (Simple check: more than just empty strings or default structure if applicable)
        if (Object.values(parsed).some(v => v !== "" && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0))) {
          setHasDraft(true);
        }
      } catch (e) {
        setHasDraft(false);
      }
    } else {
      setHasDraft(false);
    }
  }, [key, enabled]);

  // Handle debounced saving
  const saveDraft = useCallback((values: T) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(values));
      // We don't setHasDraft(true) here because we don't want to show the prompt 
      // if the user is currently working on it.
    }, 1000);
  }, [key]);

  // Watch for changes
  useEffect(() => {
    if (!enabled) return;

    const subscription = form.watch((value) => {
      // Basic check to avoid saving exact default values if needed, 
      // but usually saving everything is safer.
      saveDraft(value as T);
    });

    return () => {
      subscription.unsubscribe();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [form, key, enabled, saveDraft]);

  const restoreDraft = useCallback(() => {
    const draft = localStorage.getItem(key);
    if (draft) {
      try {
        const values = JSON.parse(draft);
        // Using reset instead of setValue for cleaner behavior
        form.reset(values);
        setHasDraft(false);
        return true;
      } catch (e) {
        console.error("Failed to restore draft", e);
      }
    }
    return false;
  }, [form, key]);

  const discardDraft = useCallback(() => {
    localStorage.removeItem(key);
    setHasDraft(false);
  }, [key]);

  return {
    hasDraft,
    restoreDraft,
    discardDraft,
  };
}
