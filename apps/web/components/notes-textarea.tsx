"use client";

import { useId, useState } from "react";
import styles from "@/components/notes-textarea.module.css";

export type NotesTextareaProps = {
  defaultValue?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  maxLength?: number;
};

export default function NotesTextarea({ defaultValue = "", name = "notes", label = "Notes", placeholder, maxLength }: NotesTextareaProps) {
  const textareaId = useId();
  const counterId = `${textareaId}-count`;
  const [length, setLength] = useState(defaultValue.length);

  return (
    <>
      <label className={styles.label} htmlFor={textareaId}>
        {label}
      </label>
      <textarea
        id={textareaId}
        className={styles.textarea}
        name={name}
        placeholder={placeholder}
        rows={2}
        maxLength={maxLength}
        defaultValue={defaultValue}
        onChange={(event) => setLength(event.currentTarget.value.length)}
        aria-describedby={counterId}
      />
      {maxLength !== undefined && (
        <div id={counterId} className={styles.characterCount}>
          {length} / {maxLength}
        </div>
      )}
    </>
  );
}
