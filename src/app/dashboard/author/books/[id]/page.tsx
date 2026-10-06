import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHead } from "@/components/ui";
import { BookForm } from "@/components/ListingForms";
import { removeBookImage } from "@/app/actions/author";
import { SubmitButton } from "@/components/SubmitButton";

export default async function EditBook({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("AUTHOR");
  const book = await db.book.findFirst({ where: { id: (await params).id, authorId: user.id }, include: { images: { orderBy: { position: "asc" } } } });
  if (!book) notFound();
  return (
    <>
      <PageHead title={`Edit “${book.title}”`} />
      {book.images.length > 0 && (
        <div className="panel" style={{ maxWidth: 720, marginBottom: 16 }}>
          <b>Extra photos</b>
          <div className="thumbs" style={{ marginTop: 10 }}>
            {book.images.map((im) => (
              <div key={im.id} className="thumb-edit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt="" />
                <form action={removeBookImage}>
                  <input type="hidden" name="id" value={im.id} />
                  <SubmitButton className="btn btn-danger btn-sm" confirm="Remove this photo?">Remove</SubmitButton>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
      <BookForm book={book} />
    </>
  );
}
