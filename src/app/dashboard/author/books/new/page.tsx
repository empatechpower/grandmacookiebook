import { PageHead } from "@/components/ui";
import { BookForm } from "@/components/ListingForms";

export default function NewBook() {
  return (
    <>
      <PageHead title="New product" sub="Submitted titles are reviewed by an admin before they appear in the catalog." />
      <BookForm />
    </>
  );
}
