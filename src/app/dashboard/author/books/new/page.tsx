import { PageHead } from "@/components/ui";
import { BookForm } from "@/components/ListingForms";

export default function NewBook() {
  return (
    <>
      <PageHead title="New product" sub="Your book goes live in the catalog as soon as you publish it." />
      <BookForm />
    </>
  );
}
