import Link from "next/link";
import { ArticleList } from "@/components/ArticlePages";

export const metadata = { title: "Resources" };
export default async function Resources() {
  return (
    <>
      <ArticleList kind="RESOURCE" title="Resources" intro="Guides, templates and reports for schools planning author visits and authors growing their audience." />
      <section className="wrap" style={{ paddingBottom: 56 }}>
        <div className="panel split">
          <div><b>Sample author visit agreement</b><p className="muted" style={{ fontSize: ".9rem" }}>A printable starting point either side can adapt and attach to a booking.</p></div>
          <Link className="btn btn-line btn-sm" href="/resources/sample-contract">Open template</Link>
        </div>
      </section>
    </>
  );
}
