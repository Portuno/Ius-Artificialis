import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ExpedienteDetailData from "./expediente-detail-data";
import ExpedienteDetailSkeleton from "./expediente-detail-skeleton";

interface ExpedienteDetailPageProps {
  params: Promise<{ id: string }>;
}

const ExpedienteDetailPage = async ({ params }: ExpedienteDetailPageProps) => {
  const { id } = await params;
  const supabase = await createClient();

  const { data: expediente, error } = await supabase
    .from("expedientes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !expediente) {
    notFound();
  }

  return (
    <Suspense
      fallback={<ExpedienteDetailSkeleton expediente={expediente} />}
    >
      <ExpedienteDetailData id={id} expediente={expediente} />
    </Suspense>
  );
};

export default ExpedienteDetailPage;
