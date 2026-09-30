import { ArticleList } from "@/components/ArticlePages";

export const metadata = { title: "Newsroom" };
export default function News() {
  return <ArticleList kind="NEWS" title="Newsroom" intro="Announcements, press and stories from our community of authors and educators." />;
}
