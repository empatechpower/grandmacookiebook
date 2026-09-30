import Link from "next/link";

export default function NotFound() {
  return (
    <section className="pad">
      <div className="wrap" style={{ textAlign: "center" }}>
        <div className="eyebrow">404</div>
        <h2>This page isn’t on the shelf.</h2>
        <p className="lede-sm">It may have been archived or is awaiting review.</p>
        <Link className="btn btn-terra" href="/books">Browse books</Link>
      </div>
    </section>
  );
}
