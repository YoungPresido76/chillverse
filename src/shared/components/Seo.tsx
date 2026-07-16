import { Helmet } from 'react-helmet-async'

const SITE_URL = 'https://chillverse.com.ng'
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`

interface SeoProps {
  /** Page title WITHOUT the site suffix — this component appends "— Chillverse" for you. */
  title: string
  description: string
  /** Path only, e.g. "/privacy". Leave empty for the homepage. */
  path?: string
  ogImage?: string
  /** Set true only for genuinely non-indexable pages (e.g. auth forms, admin). */
  noindex?: boolean
  /** Extra JSON-LD objects to inject (BreadcrumbList, Article, etc.) alongside the page. */
  jsonLd?: Record<string, unknown>[]
}

export default function Seo({
  title,
  description,
  path = '',
  ogImage = DEFAULT_OG_IMAGE,
  noindex = false,
  jsonLd = [],
}: SeoProps) {
  const url = `${SITE_URL}${path}`
  const fullTitle = path === '' ? title : `${title} — Chillverse`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Chillverse" />
      <meta property="og:locale" content="en_NG" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd.map((obj, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(obj)}
        </script>
      ))}
    </Helmet>
  )
}
