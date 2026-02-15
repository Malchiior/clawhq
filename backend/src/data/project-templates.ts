export interface TemplateItem {
  stage: string
  category?: string
  title: string
  description?: string
  order: number
}

export interface ProjectTemplate {
  id: string
  name: string
  icon: string
  description: string
  items: TemplateItem[]
}

function items(stage: string, titles: string[], category?: string, startOrder = 0): TemplateItem[] {
  return titles.map((title, i) => ({ stage, category, title, order: startOrder + i }))
}

const saasLaunchItems: TemplateItem[] = [
  ...items('infrastructure', [
    'GitHub repo created',
    'Domain purchased (Namecheap)',
    'DNS configured (A record + CNAME)',
    'SSL certificate provisioned',
    'Frontend hosting setup (Vercel)',
    'Backend hosting setup (Railway)',
    'Database provisioned (Neon/Supabase)',
    'Transactional email service (Resend)',
    'Payment processor (Stripe account + keys)',
    'Error tracking (Sentry)',
    'Analytics (PostHog/GA4)',
    'All environment variables documented',
  ]),
  ...items('infrastructure', [
    'GitHub token/access',
    'Domain registrar login',
    'Vercel token',
    'Railway token',
    'Database connection string',
    'Resend API key',
    'Stripe secret + publishable keys',
    'Sentry DSN',
    'Analytics tracking IDs',
  ], 'Required Logins/Keys', 12),
  ...items('discovery', [
    'Problem statement defined',
    'Target audience identified',
    'Competitive research (3+ competitors analyzed)',
    'Unique value proposition written',
    'Feature list prioritized (MVP vs nice-to-have)',
    'User personas created (2-3)',
    'Revenue model defined',
    'Success metrics identified',
  ]),
  ...items('design', [
    'Color theme selected (primary, secondary, accent, backgrounds)',
    'Typography chosen (heading + body fonts)',
    'Logo designed',
    'Favicon + OG image created',
    'Wireframes for core pages',
    'UI mockups for key flows',
    'Brand guidelines documented',
    '⛔ USER TESTING CHECKPOINT: Show mockups to 3+ potential users',
  ]),
  ...items('dev-1', [
    'Project scaffolded (frontend + backend)',
    'Authentication (signup/login/logout/password reset)',
    'Email verification',
    'Database schema finalized',
    'Core feature #1 built',
    'Core feature #2 built',
    'Core feature #3 built',
    'API endpoints documented',
    'File upload (if needed)',
    '⛔ USER TESTING CHECKPOINT: Core flow works end-to-end',
  ]),
  ...items('dev-2', [
    'Responsive design (mobile + tablet + desktop)',
    'Loading states and skeletons',
    'Error handling (user-friendly messages)',
    'Empty states for all pages',
    'Animations and transitions',
    'Keyboard shortcuts',
    'Accessibility (WCAG basics)',
    'Dark mode (if applicable)',
  ]),
  ...items('testing', [
    'Unit tests for critical functions',
    'E2E test: signup → core feature → success',
    'E2E test: payment flow',
    'Cross-browser testing (Chrome, Firefox, Safari)',
    'Mobile testing (iOS Safari, Android Chrome)',
    'Performance audit (Lighthouse 90+)',
    'Security audit (auth, XSS, CSRF, rate limiting)',
    '⛔ USER TESTING CHECKPOINT: Full beta test with 5+ users, collect feedback',
  ]),
  ...items('billing', [
    'Pricing tiers defined',
    'Stripe products + prices created',
    'Checkout flow built',
    'Subscription management (upgrade/downgrade/cancel)',
    'Webhook handling (payment success, failure, cancellation)',
    'Free tier / trial period configured',
    'Invoice / receipt emails',
    'Usage limits enforced per tier',
  ]),
  ...items('deploy', [
    'Production environment configured',
    'CI/CD pipeline (auto-deploy on push)',
    'Domain pointed to production',
    'SSL verified',
    'Database backups configured',
    'Monitoring + uptime alerts',
    'Rate limiting in production',
    'CORS configured',
    'Environment variables set (all services)',
    'Smoke test on production URL',
  ]),
  ...items('marketing', [
    'Landing page live',
    'SEO: meta tags, sitemap.xml, robots.txt, JSON-LD',
    'Social media accounts created',
    'Launch posts drafted (Twitter, Reddit, Product Hunt)',
    'Email waitlist / newsletter setup',
    'Blog post: "Introducing [Product]"',
    'Demo video / screenshots',
    '⛔ USER TESTING CHECKPOINT: Landing page A/B test or feedback',
  ]),
  ...items('post-launch', [
    'Analytics tracking verified',
    'First week metrics reviewed',
    'User feedback collected and triaged',
    'Bug fixes from launch',
    'Iteration plan based on data',
    'Changelog started',
    'Support system live',
  ]),
]

const ecommerceItems: TemplateItem[] = [
  ...items('infrastructure', [
    'GitHub repo created',
    'Domain purchased',
    'Frontend hosting (Vercel)',
    'Backend hosting (Railway)',
    'Database provisioned',
    'Stripe account + keys',
    'Email service (Resend)',
    'Analytics setup',
  ]),
  ...items('discovery', [
    'Product niche defined',
    'Target audience identified',
    'Competitor analysis',
    'Pricing strategy defined',
    'Supplier/fulfillment sourced',
  ]),
  ...items('design', [
    'Brand identity (logo, colors, fonts)',
    'Product page wireframes',
    'Cart + checkout flow mockup',
    '⛔ USER TESTING CHECKPOINT: Show mockups to potential customers',
  ]),
  ...items('dev-1', [
    'Product catalog (CRUD)',
    'Product detail pages',
    'Shopping cart',
    'Stripe checkout integration',
    'Order management',
    'Inventory tracking',
    'User accounts + order history',
  ]),
  ...items('dev-2', [
    'Responsive design',
    'Search + filtering',
    'Reviews / ratings',
    'Email notifications (order confirmation, shipping)',
    'Printify/Shopify integration (if applicable)',
  ]),
  ...items('testing', [
    'E2E: browse → add to cart → checkout → confirmation',
    'Payment flow testing',
    'Mobile testing',
    '⛔ USER TESTING CHECKPOINT: Beta test with 5+ users',
  ]),
  ...items('deploy', [
    'Production deploy',
    'Domain + SSL',
    'CI/CD pipeline',
    'Monitoring setup',
  ]),
  ...items('marketing', [
    'Landing/storefront live',
    'SEO optimized',
    'Social media presence',
    'Launch announcement',
  ]),
]

const mobileAppItems: TemplateItem[] = [
  ...items('infrastructure', [
    'GitHub repo created',
    'React Native / Expo scaffold',
    'Backend hosting (Railway)',
    'Database provisioned',
    'Push notification service (Firebase/Expo)',
    'App Store developer account',
    'Play Store developer account',
  ]),
  ...items('discovery', [
    'Problem statement defined',
    'Target audience identified',
    'Feature list (MVP)',
    'Monetization strategy',
  ]),
  ...items('design', [
    'App icon + splash screen',
    'UI mockups (Figma)',
    'Navigation flow defined',
    '⛔ USER TESTING CHECKPOINT: Show mockups to 3+ users',
  ]),
  ...items('dev-1', [
    'Navigation scaffold',
    'Authentication',
    'Core feature #1',
    'Core feature #2',
    'API integration',
    'Push notifications',
    'Deep linking',
  ]),
  ...items('dev-2', [
    'Offline support',
    'Loading states',
    'Error handling',
    'Animations',
    'Accessibility',
  ]),
  ...items('testing', [
    'Device testing (iOS + Android)',
    'E2E core flow',
    'Performance profiling',
    '⛔ USER TESTING CHECKPOINT: TestFlight/internal testing with 5+ users',
  ]),
  ...items('deploy', [
    'App Store submission',
    'Play Store submission',
    'CI/CD (EAS Build / Fastlane)',
    'Crash reporting (Sentry)',
  ]),
  ...items('marketing', [
    'App Store listing optimized (ASO)',
    'Screenshots + preview video',
    'Launch announcement',
    'Landing page',
  ]),
]

const landingPageItems: TemplateItem[] = [
  ...items('infrastructure', [
    'GitHub repo created',
    'Domain purchased',
    'Hosting setup (Vercel/Netlify)',
    'Analytics (GA4/PostHog)',
  ]),
  ...items('design', [
    'Hero section wireframe',
    'Color + typography chosen',
    'Logo / brand mark',
    'Full page mockup',
  ]),
  ...items('dev-1', [
    'Hero section + CTA',
    'Features section',
    'Pricing section',
    'Testimonials / social proof',
    'Footer + navigation',
    'Email signup / waitlist form',
    'Responsive design',
  ]),
  ...items('deploy', [
    'Domain + SSL configured',
    'Production deploy',
    'SEO: meta tags, OG image, sitemap.xml',
  ]),
  ...items('marketing', [
    'Landing page live',
    'Social sharing optimized',
    'Launch posts drafted',
    '⛔ USER TESTING CHECKPOINT: A/B test or feedback round',
  ]),
]

const apiBackendItems: TemplateItem[] = [
  ...items('infrastructure', [
    'GitHub repo created',
    'Hosting setup (Railway/Fly.io)',
    'Database provisioned',
    'Environment variables documented',
  ]),
  ...items('discovery', [
    'API scope defined',
    'Data model designed',
    'Endpoint list planned',
    'Auth strategy chosen',
  ]),
  ...items('dev-1', [
    'Project scaffold (Express/Fastify)',
    'Database schema + migrations',
    'Authentication (JWT/API keys)',
    'Core CRUD endpoints',
    'Input validation',
    'Error handling',
  ]),
  ...items('dev-2', [
    'Rate limiting',
    'Pagination + filtering',
    'Caching strategy',
    'Logging + monitoring',
  ]),
  ...items('testing', [
    'Unit tests for business logic',
    'Integration tests for endpoints',
    'Load testing',
    'Security audit',
  ]),
  ...items('deploy', [
    'Production deploy',
    'CI/CD pipeline',
    'API documentation (Swagger/OpenAPI)',
    'Monitoring + alerts',
  ]),
]

const blankItems: TemplateItem[] = [
  ...items('infrastructure', [
    'GitHub repo created',
    'Hosting configured',
    'Database provisioned',
    'Environment variables documented',
  ]),
]

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  { id: 'saas-launch', name: 'SaaS Launch', icon: '🚀', description: 'Full SaaS product from idea to launch — the OCD checklist', items: saasLaunchItems },
  { id: 'ecommerce', name: 'E-Commerce Store', icon: '🛒', description: 'Product catalog, checkout, inventory, fulfillment', items: ecommerceItems },
  { id: 'mobile-app', name: 'Mobile App', icon: '📱', description: 'React Native app with App Store + Play Store submission', items: mobileAppItems },
  { id: 'landing-page', name: 'Landing Page', icon: '🌐', description: 'Hero, features, pricing, CTA, SEO, deploy', items: landingPageItems },
  { id: 'api-backend', name: 'API / Backend', icon: '⚙️', description: 'Schema, endpoints, auth, docs, rate limiting, deploy', items: apiBackendItems },
  { id: 'blank', name: 'Blank', icon: '📄', description: 'Start from scratch — just infrastructure, add your own items', items: blankItems },
]
