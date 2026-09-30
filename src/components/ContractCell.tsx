import Link from "next/link";
import { attachContract } from "@/app/actions/contracts";
import { SubmitButton } from "./SubmitButton";

/** View / attach the optional PDF contract on a booking row. */
export function ContractCell({ b }: { b: { id: string; status: string; contractKey: string | null; contractName: string | null } }) {
  const active = ["PENDING", "ACCEPTED", "CONFIRMED"].includes(b.status);
  return (
    <div style={{ fontSize: ".8rem", marginTop: 6 }}>
      {b.contractKey && (
        <a href={`/api/contracts/${b.id}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
          📄 {b.contractName ?? "Contract"}
        </a>
      )}
      {active && (
        <details style={{ marginTop: 4 }}>
          <summary className="muted" style={{ cursor: "pointer" }}>{b.contractKey ? "Replace contract" : "Attach contract (optional)"}</summary>
          <form action={attachContract} className="inline-form" style={{ marginTop: 6, flexWrap: "wrap" }}>
            <input type="hidden" name="id" value={b.id} />
            <input type="file" name="contract" accept="application/pdf" required style={{ maxWidth: 200 }} />
            <SubmitButton className="btn btn-line btn-sm" pendingText="Uploading…">Attach</SubmitButton>
          </form>
          <Link href="/resources/sample-contract" target="_blank" className="muted" style={{ textDecoration: "underline" }}>
            Sample contract template
          </Link>
        </details>
      )}
    </div>
  );
}
