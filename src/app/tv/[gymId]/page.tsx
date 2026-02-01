import { notFound } from 'next/navigation';
import { getTVData } from '@/actions/tv';
import { TVDisplay } from './tv-display';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TVPage({
  params,
}: {
  params: Promise<{ gymId: string }>;
}) {
  const { gymId } = await params;
  const tvData = await getTVData(gymId);

  if (!tvData.org) {
    notFound();
  }

  return <TVDisplay initialData={tvData} orgId={gymId} />;
}
