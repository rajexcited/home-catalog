"use client";

import { useId, useRef, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { TrashIcon } from "@/components/icons";
import styles from "@/components/confirm-delete-form.module.css";

export type ConfirmDeleteFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  className?: string;
  children: ReactNode;
};

export default function ConfirmDeleteForm({ action, message, className, children }: ConfirmDeleteFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmedRef = useRef(false);
  const titleId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // the submit re-fired by handleConfirm must pass through to the server action
    if (confirmedRef.current) {
      confirmedRef.current = false;
      return;
    }
    event.preventDefault();
    dialogRef.current?.showModal();
  }

  function handleConfirm() {
    confirmedRef.current = true;
    dialogRef.current?.close();
    formRef.current?.requestSubmit();
  }

  function handleCancel() {
    dialogRef.current?.close();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  }

  return (
    <>
      <form ref={formRef} action={action} className={className} onSubmit={handleSubmit}>
        {children}
      </form>
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} onClick={handleBackdropClick}>
        <div className={styles.body}>
          <span className={styles.iconWrap} aria-hidden="true">
            <TrashIcon size={18} />
          </span>
          <h2 id={titleId} className={styles.title}>
            Confirm delete
          </h2>
          <p className={styles.message}>{message}</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={handleCancel}>
            Cancel
          </button>
          <button type="button" className={styles.confirmBtn} onClick={handleConfirm}>
            Delete
          </button>
        </div>
      </dialog>
    </>
  );
}
