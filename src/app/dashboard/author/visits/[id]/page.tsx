import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageHead } from "@/components/ui";
import { PackageForm } from "@/components/ListingForms";

export default async function EditPackage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("AUTHOR");
  const pkg = await db.visitPackage.findFirst({ where: { id: (await params).id, authorId: user.id } });
  if (!pkg) notFound();
  return (
    <>
      <PageHead title={`Edit “${pkg.title}”`} />
      <PackageForm pkg={pkg} />
    </>
  );
}
