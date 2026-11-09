"use client";

import { useFormStatus } from "react-dom";

import styles from "@/app/search/search.module.css";

export function SearchPendingIndicator() {
  const { pending } = useFormStatus();

  if (!pending) {
    return null;
  }

  return (
    <span className={styles.searchPending} aria-live="polite" aria-label="Searching">
      <span className={styles.searchPendingDot} aria-hidden="true" />
      Searching...
    </span>
  );
}
