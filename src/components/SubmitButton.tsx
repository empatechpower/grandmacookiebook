"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "btn btn-ink",
  pendingText,
  confirm,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string; confirm?: string }) {
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
    >
      {pending ? pendingText ?? "Working…" : children}
    </button>
  );
}
