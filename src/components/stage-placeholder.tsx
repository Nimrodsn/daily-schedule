import { PageHeading } from "@/components/page-heading";

export function StagePlaceholder({
  title,
  subtitle,
  stage,
}: {
  title: string;
  subtitle: string;
  stage: string;
}) {
  return (
    <>
      <PageHeading title={title} subtitle={subtitle} />
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        המסך הזה ייבנה ב{stage}.
      </div>
    </>
  );
}
