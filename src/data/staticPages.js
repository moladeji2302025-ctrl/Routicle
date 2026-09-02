export const STATIC_PAGES = {
  about: {
    title: 'About Routicle',
    paragraphs: [
      'Routicle is a subscriber-share creative marketplace: creators upload finished design and video work they never got to use, subscribers pay to download the real underlying source files, and half of every subscription dollar is pooled and paid out to creators every month.',
      'It exists because most finished creative work — a rejected pitch deck, an unused motion loop, a concept piece a client passed on — sits on a hard drive earning nothing after the first (and only) time it was shown. Routicle gives that work a second life, non-exclusively, without creators giving up any rights to it.',
      'A built-in AI Image and Video Studio ships with every paid plan, so subscribers who need something that doesn’t already exist in the library can generate it themselves, in the same place.',
      'Routicle is early — currently onboarding its first founding creators and building out the library before public launch.',
    ],
  },
  careers: {
    title: 'Careers',
    paragraphs: [
      'Routicle isn’t hiring yet — the team right now is just getting the founding creator library and core product built.',
      'That will change as the platform grows. Check back here, or reach out via the Contact page if you want to be kept in the loop.',
    ],
  },
  brand: {
    title: 'Brand',
    paragraphs: [
      'Routicle’s brand mark is the stylized "R" used across the app and in the navigation bar, paired with the Satoshi typeface and a violet-to-lavender color palette.',
      'A full press kit — logo files, color values, and usage guidelines — isn’t published yet. If you need brand assets for a specific purpose (press, integration, partnership), reach out via Contact.',
    ],
  },
  contact: {
    title: 'Contact',
    paragraphs: [
      'For questions about Routicle — as a subscriber, a creator, or anything else — reach out at hello@routicle.app.',
      'Response times may be slow right now; the platform is run by a small team while it’s pre-launch.',
    ],
  },
  blog: {
    title: 'Blog',
    paragraphs: [
      'Nothing published yet. Once Routicle is further along, this is where product updates, creator spotlights, and behind-the-scenes notes will live.',
    ],
  },
  help: {
    title: 'Help Center',
    paragraphs: [
      'Frequently asked questions:',
    ],
    faq: [
      {
        q: 'What do I actually get when I download something?',
        a: 'The real, editable source file(s) behind the piece — not a flattened export. Depending on the piece, that might be a PSD, AI, Canva, After Effects, Premiere Pro, or Figma file.',
      },
      {
        q: 'Is what I download exclusive to me?',
        a: 'No — licenses on Routicle are non-exclusive. The creator keeps every right to their work and can sell or post it elsewhere too. You get a license to use the file; you don’t buy the work outright.',
      },
      {
        q: 'How do creators get paid?',
        a: 'Half of all subscription revenue is pooled monthly and split among creators based on downloads/engagement of their work. See the Become a Creator page for the full breakdown.',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes — subscriptions can be cancelled anytime from your Account page, no minimum commitment.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    paragraphs: [
      'This is placeholder terms-of-service language for Routicle’s pre-launch build — not final, reviewed legal terms. Real Terms of Service will be published before public launch.',
      'In short, as currently intended: subscribers get a non-exclusive license to download and use files for the duration described by their plan; creators retain full ownership and copyright of everything they upload and grant Routicle and its subscribers a non-exclusive license to distribute and use it; uploaded work must be the creator’s own, free of client-owned trademarks or confidential material; and accounts may be suspended for uploads that violate these terms.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    paragraphs: [
      'This is placeholder privacy language for Routicle’s pre-launch build — not a final, reviewed policy. A complete Privacy Policy will be published before public launch.',
      'As currently intended: Routicle collects the account information needed to run the service (name, email, billing details via its payment processor, and usage data like downloads and generations), does not sell personal data to third parties, and retains data for as long as an account is active plus a reasonable period after for legal and accounting purposes.',
    ],
  },
}

export function getStaticPage(slug) {
  return STATIC_PAGES[slug]
}
