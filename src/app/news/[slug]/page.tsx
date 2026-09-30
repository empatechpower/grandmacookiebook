import { ArticleView, articleMeta } from "@/components/ArticlePages";

type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P) {
  return articleMeta("NEWS", (await params).slug);
}
export default async function Page({ params }: P) {
  return <ArticleView kind="NEWS" slug={(await params).slug} />;
}
