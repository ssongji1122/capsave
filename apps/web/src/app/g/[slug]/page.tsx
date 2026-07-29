import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicGuideExperience } from '@/components/guides/PublicGuideExperience';
import { findPublicGuide, ULUWATU_GUIDE } from '@/lib/public-guides';

const SITE_ORIGIN = 'https://scrave.app';

interface GuidePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return [{ slug: ULUWATU_GUIDE.slug }];
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = findPublicGuide(slug);

  if (!guide) {
    return {};
  }

  const canonicalUrl = `${SITE_ORIGIN}/g/${guide.slug}`;

  return {
    title: `${guide.title} | Scrave`,
    description: guide.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: guide.title,
      description: guide.description,
      type: 'article',
      locale: 'ko_KR',
      url: canonicalUrl,
      siteName: 'Scrave',
    },
    twitter: {
      card: 'summary_large_image',
      title: guide.title,
      description: guide.description,
    },
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = findPublicGuide(slug);

  if (!guide) {
    notFound();
  }

  return (
    <PublicGuideExperience
      guide={guide}
      canonicalUrl={`${SITE_ORIGIN}/g/${guide.slug}`}
    />
  );
}
