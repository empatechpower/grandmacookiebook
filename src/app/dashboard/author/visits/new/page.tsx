import { PageHead } from "@/components/ui";
import { PackageForm } from "@/components/ListingForms";

export default function NewPackage() {
  return (
    <>
      <PageHead title="Create New Listing" sub="Packages are reviewed by an admin before buyers can book them." />
      <PackageForm />
    </>
  );
}
