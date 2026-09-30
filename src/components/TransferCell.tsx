import { retryTransfer } from "@/app/actions/admin";
import { SubmitButton } from "./SubmitButton";
import { fmtDate } from "@/lib/dates";

/** Admin view of an author's share: sent, held (with early release), or failed (with retry). */
export function TransferCell({ kind, id, transferId, transferError, releaseAt, paid }: {
  kind: "item" | "booking";
  id: string;
  transferId: string | null;
  transferError: string | null;
  releaseAt: Date | null;
  paid: boolean;
}) {
  if (transferId) return <span className="badge b-ok" title={transferId}>Sent</span>;
  if (!paid) return <span className="muted">—</span>;
  return (
    <form action={retryTransfer} className="inline-form">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      {transferError ? (
        <span className="badge b-off" title={transferError}>Failed</span>
      ) : (
        <span className="badge b-wait">Held{releaseAt ? ` · ${fmtDate(releaseAt)}` : ""}</span>
      )}
      <SubmitButton className="btn btn-line btn-sm" confirm={transferError ? undefined : "Release this payment to the author now?"}>
        {transferError ? "Retry" : "Release now"}
      </SubmitButton>
    </form>
  );
}
