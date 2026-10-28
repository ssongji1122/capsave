import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSharedGuideBySlug, type PublicGuide } from '@scrave/shared';
import { PublicGuideExperience } from '@/components/guides/PublicGuideExperience';
import { findPublicGuide, PUBLIC_GUIDES } from '@/lib/public-guides';
import { SITE_ORIGIN } from '@/lib/site-config';
import { createClient } from '@/lib/supabase/server';

interface GuidePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return PUBLIC_GUIDES.map(({ slug }) => ({ slug }));
}

async function resolveGuide(
  slug: string,
): Promise<{ guide: PublicGuide; isStatic: boolean } | null> {
  const staticGuide = findPublicGuide(slug);
  if (staticGuide) {
    return { guide: staticGuide, isStatic: true };
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  try {
    const supabase = await createClient();
    const shared = await getSharedGuideBySlug(supabase, slug);
    if (!shared) return null;
    return { guide: shared, isStatic: false };
  } catch (error) {
    console.error('[g/[slug]] failed to load shared guide:', error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolved = await resolveGuide(slug);

  if (!resolved) {
    return {};
  }

  const { guide, isStatic } = resolved;
  const canonicalUrl = `${SITE_ORIGIN}/g/${guide.slug}`;

  return {
    title: `${guide.title} | Scrave`,
    description: guide.description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: isStatic ? undefined : { index: false, follow: false },
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
  const resolved = await resolveGuide(slug);

  if (!resolved) {
    notFound();
  }

  return (
    <PublicGuideExperience
      guide={resolved.guide}
      canonicalUrl={`${SITE_ORIGIN}/g/${resolved.guide.slug}`}
    />
  );
}
