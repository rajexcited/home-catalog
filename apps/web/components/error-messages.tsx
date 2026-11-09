import { AlertIcon } from "./icons";
import styles from "@/components/error-messages.module.css";

type ErrorItem = string | null | undefined;

type ErrorMessagesProps = {
  errors: ErrorItem[];
};

const formatErrorMessage = (value: string) => {
  const message = value.trim().replace(/\s+/g, " ");
  if (!message) return { formattedMessage: "", key: "" };

  const normalized = message.charAt(0).toUpperCase() + message.slice(1);
  const formattedMessage = /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
  return { formattedMessage, key: normalized.replace(/\s+/g, "-").toLowerCase() };
};

const getValidErrors = (errors: ErrorItem[] = []) =>
  errors
    .filter(Boolean)
    .filter((item): item is string => typeof item === "string")
    .map(formatErrorMessage);

export default function ErrorMessages({ errors = [] }: ErrorMessagesProps) {
  const validErrors = getValidErrors(errors);

  if (!validErrors.length) return null;

  return (
    <div className={styles.toastErr}>
      <ul role="alert" aria-live="polite">
        {validErrors.map(({ formattedMessage, key }) => (
          <li key={key} className="flex items-start gap-2 text-sm text-red-600">
            <AlertIcon size={16} aria-hidden="true" />
            <span>{formattedMessage}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
