import { PageHead } from "@/components/ui";
import { PackageForm } from "@/components/ListingForms";

export default function NewPackage() {
  return (
    <>
      <PageHead title="Create New Listing" sub="Your listing goes live as soon as you publish it." />
      <PackageForm />
    </>
  );
}
