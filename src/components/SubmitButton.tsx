"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "btn btn-ink",
  pendingText,
  confirm,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string | null; confirm?: string }) {
  const status = useFormStatus();
  // A button with its own name/value (e.g. Accept vs Decline, or one photo's Remove) only shows as busy when it was the one clicked.
  // (A button with its own formAction is busy only when that action is the one running.)
  const mine =
    typeof rest.formAction === "function"
      ? status.action === rest.formAction
      : !(rest.name && rest.value !== undefined) || status.data?.get(String(rest.name)) === String(rest.value);
  const pending = status.pending && mine;
  return (
    <button
      {...rest}
      type="submit"
      className={className}
      disabled={status.pending || rest.disabled}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      aria-busy={pending || undefined}
      data-pending={pending || undefined}
    >
      {pending && pendingText !== null && <span className="spin" aria-hidden />}
      {pending && pendingText !== null ? pendingText ?? "Working…" : children}
    </button>
  );
}
