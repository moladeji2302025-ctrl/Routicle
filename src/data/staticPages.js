/**
 * The site's information pages. The wording is the same as it has always been;
 * what changed is that it is now structured, so each page can be laid out for
 * what it is (steps and a story for About, a brand kit for Brand, an accordion
 * for Help) instead of every page being a heading over paragraphs.
 *
 * `layout` picks the template in src/pages/StaticPage.jsx.
 */

export const CONTACT_EMAIL = 'hello@routicle.app'

/** Order here is the order of the sub-navigation across the top of each page. */
export const STATIC_NAV = [
  { slug: 'about', label: 'About' },
  { slug: 'careers', label: 'Careers' },
  { slug: 'brand', label: 'Brand' },
  { slug: 'contact', label: 'Contact' },
  { slug: 'blog', label: 'Blog' },
  { slug: 'help', label: 'Help' },
  { slug: 'terms', label: 'Terms' },
  { slug: 'privacy', label: 'Privacy' },
]

export const STATIC_PAGES = {
  about: {
    layout: 'about',
    title: 'About Routicle',
    accent: 'Routicle',
    eyebrow: 'Our story',
    lede: 'Routicle is a marketplace for creative work. Creators upload finished design and video work they never got to use, subscribers pay to download the source files, and half of every subscription dollar is paid out to creators each month.',
    steps: [
      { title: 'Creators upload', body: 'Finished design and video work they never got to use, with every right kept.' },
      { title: 'Subscribers download', body: 'The editable source files behind each piece, not a flattened export.' },
      { title: 'Half is paid out', body: 'Half of every subscription dollar goes to creators each month.' },
    ],
    story: {
      quote: 'Most finished creative work ends up on a hard drive after being shown once.',
      body: 'It started with a simple problem. A rejected pitch deck, a motion loop that never got used, a concept a client passed on: most finished creative work ends up on a hard drive after being shown once. Routicle gives that work a second life, and creators keep every right to it.',
    },
    suite: {
      title: 'The Creative and Business Suite',
      body: 'Every plan also comes with the Creative and Business Suite: turn a sketch into a logo pack, drop it into a featured template, and send clients proposals, contracts and invoices.',
      features: ['Sketch to logo pack', 'Featured templates', 'Proposals and contracts', 'Invoices'],
    },
    status: "Routicle is still early. We're bringing on our first founding creators and building the library before we launch publicly.",
  },

  careers: {
    layout: 'careers',
    title: 'Careers',
    accent: 'Careers',
    eyebrow: 'Join us',
    lede: 'Routicle isn’t hiring yet. Right now the team is focused on building the product and the founding creator library.',
    status: { label: 'Not hiring right now', detail: 'No open roles' },
    body: 'That will change as we grow. Check back here, or get in touch through the Contact page if you’d like us to let you know.',
  },

  brand: {
    layout: 'brand',
    title: 'Brand',
    accent: 'Brand',
    eyebrow: 'Identity',
    lede: 'Our logo is the stylized R you see across the app, and we pair it with the Satoshi typeface and a violet and lavender color palette.',
    palette: [
      { name: 'Violet', hex: '#6750DE', note: 'Primary' },
      { name: 'Purple', hex: '#B199FD', note: 'Accent' },
      { name: 'Lavender', hex: '#E3DBFC', note: 'Soft fill' },
      { name: 'Ink', hex: '#16161A', note: 'Text' },
    ],
    body: 'We haven’t published a press kit with logo files, colours and usage guidelines yet. If you need brand assets for press, an integration or a partnership, get in touch through the Contact page.',
  },

  contact: {
    layout: 'contact',
    title: 'Contact',
    accent: 'Contact',
    eyebrow: 'Get in touch',
    lede: 'If you have a question about Routicle, whether you’re a subscriber, a creator or just curious, email us.',
    note: 'We’re a small team and haven’t launched yet, so replies might take a little while.',
    routes: [
      { title: 'A question about how it works', body: 'Start with the Help Center. It covers downloads, licenses and payouts.', to: '/help', cta: 'Open Help Center' },
      { title: 'You make creative work', body: 'See how creators are paid and apply to join the founding library.', to: '/become-creator', cta: 'Become a creator' },
      { title: 'Press, integrations or partnerships', body: 'Email us and say what you have in mind.', mail: true, cta: 'Write to us' },
    ],
  },

  blog: {
    layout: 'blog',
    title: 'Blog',
    accent: 'Blog',
    eyebrow: 'Notes and news',
    lede: 'Nothing here yet. Once Routicle is further along, we’ll post product updates, creator spotlights and notes on what we’re working on.',
    topics: ['Product updates', 'Creator spotlights', 'Work in progress'],
  },

  help: {
    layout: 'help',
    title: 'Help Center',
    accent: 'Help',
    eyebrow: 'Support',
    lede: 'Answers to the questions we hear most. Can’t find yours? Ask us directly.',
    faq: [
      {
        q: 'What do I actually get when I download something?',
        a: 'The editable source files behind the piece, not a flattened export. Depending on the piece, that could be a PSD, AI, Canva, After Effects, Premiere Pro or Figma file.',
      },
      {
        q: 'Is what I download exclusive to me?',
        a: 'No. Licenses on Routicle are non-exclusive, so the creator keeps every right to their work and can sell or post it elsewhere. You get a license to use the file, but you don’t buy the work outright.',
      },
      {
        q: 'How do creators get paid?',
        a: 'Half of all subscription revenue goes into a monthly pool that’s split between creators based on how often their work is downloaded. The Become a Creator page has the full breakdown.',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes. You can cancel anytime from your Account page, and there’s no minimum commitment.',
      },
    ],
  },

  terms: {
    layout: 'legal',
    title: 'Terms of Service',
    accent: 'Service',
    eyebrow: 'Legal',
    lede: 'The rules for using Routicle, in plain language.',
    notice: 'This is placeholder text for Routicle’s pre-launch build, not final legal terms. The full Terms of Service will be published before launch.',
    intro: 'In short, as currently intended:',
    points: [
      { title: 'Licenses for subscribers', body: 'Subscribers get a non-exclusive license to download and use files for the duration described by their plan.' },
      { title: 'Creators keep ownership', body: 'Creators retain full ownership and copyright of everything they upload, and grant Routicle and its subscribers a non-exclusive license to distribute and use it.' },
      { title: 'Original work only', body: 'Uploaded work must be the creator’s own, free of client-owned trademarks or confidential material.' },
      { title: 'Enforcement', body: 'Accounts may be suspended for uploads that violate these terms.' },
    ],
  },

  privacy: {
    layout: 'legal',
    title: 'Privacy Policy',
    accent: 'Policy',
    eyebrow: 'Legal',
    lede: 'What we collect, what we don’t do with it, and how long we keep it.',
    notice: 'This is placeholder text for Routicle’s pre-launch build, not a final privacy policy. The full Privacy Policy will be published before launch.',
    intro: 'As currently intended:',
    points: [
      { title: 'What we collect', body: 'The account information needed to run the service: name, email, billing details via its payment processor, and usage data like downloads and generations.' },
      { title: 'What we don’t do', body: 'Routicle does not sell personal data to third parties.' },
      { title: 'How long we keep it', body: 'Data is retained for as long as an account is active, plus a reasonable period after for legal and accounting purposes.' },
    ],
  },
}

export function getStaticPage(slug) {
  return STATIC_PAGES[slug]
}
