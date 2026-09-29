import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://propnest.fly.dev'

export default function sitemap(): MetadataRoute.Sitemap {
  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/register`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // In production: fetch active listing slugs from the API and add them here
  // const listings = await fetch(`${API_URL}/listings?status=active&limit=1000`).then(r => r.json())
  // const listingRoutes = listings.data.map((l) => ({
  //   url: `${BASE_URL}/listings/${l.slug}`,
  //   lastModified: new Date(l.updated_at),
  //   changeFrequency: 'daily' as const,
  //   priority: 0.8,
  // }))
  // return [...staticRoutes, ...listingRoutes]

  return staticRoutes
}
