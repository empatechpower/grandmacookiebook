import { PageHead } from "@/components/ui";
import { getSettings } from "@/lib/settings";
import { tiersFrom } from "@/lib/pricing";
import { BookForm } from "@/components/ListingForms";

export default async function NewBook() {
  return (
    <>
      <PageHead title="New product" sub="Your book goes live in the catalog as soon as you publish it." />
      <BookForm tiers={tiersFrom(await getSettings())} />
    </>
  );
}
