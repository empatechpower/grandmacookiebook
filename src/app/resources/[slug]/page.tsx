import { ArticleView, articleMeta } from "@/components/ArticlePages";

type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P) {
  return articleMeta("RESOURCE", (await params).slug);
}
export default async function Page({ params }: P) {
  return <ArticleView kind="RESOURCE" slug={(await params).slug} />;
}
