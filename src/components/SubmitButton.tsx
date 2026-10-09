"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "btn btn-ink",
  pendingText,
  confirm,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string | null; confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      {...rest}
      type="submit"
      className={className}
      disabled={pending || rest.disabled}
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
