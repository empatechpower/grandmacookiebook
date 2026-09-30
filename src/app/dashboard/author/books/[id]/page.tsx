import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHead } from "@/components/ui";
import { BookForm } from "@/components/ListingForms";

export default async function EditBook({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("AUTHOR");
  const book = await db.book.findFirst({ where: { id: (await params).id, authorId: user.id } });
  if (!book) notFound();
  return (
    <>
      <PageHead title={`Edit “${book.title}”`} />
      <BookForm book={book} />
    </>
  );
}
