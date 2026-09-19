export const STATIC_PAGES = {
  about: {
    title: 'About Routicle',
    paragraphs: [
      'Routicle is a marketplace for creative work. Creators upload finished design and video work they never got to use, subscribers pay to download the source files, and half of every subscription dollar is paid out to creators each month.',
      'It started with a simple problem. A rejected pitch deck, a motion loop that never got used, a concept a client passed on: most finished creative work ends up on a hard drive after being shown once. Routicle gives that work a second life, and creators keep every right to it.',
      'Every plan also comes with the Creative and Business Suite: turn a sketch into a logo pack, drop it into a featured template, and send clients proposals, contracts and invoices.',
      "Routicle is still early. We're bringing on our first founding creators and building the library before we launch publicly.",
    ],
  },
  careers: {
    title: 'Careers',
    paragraphs: [
      'Routicle isn’t hiring yet. Right now the team is focused on building the product and the founding creator library.',
      'That will change as we grow. Check back here, or get in touch through the Contact page if you’d like us to let you know.',
    ],
  },
  brand: {
    title: 'Brand',
    paragraphs: [
      'Our logo is the stylized R you see across the app, and we pair it with the Satoshi typeface and a violet and lavender color palette.',
      'We haven’t published a press kit with logo files, colours and usage guidelines yet. If you need brand assets for press, an integration or a partnership, get in touch through the Contact page.',
    ],
  },
  contact: {
    title: 'Contact',
    paragraphs: [
      'If you have a question about Routicle, whether you’re a subscriber, a creator or just curious, email us at hello@routicle.app.',
      'We’re a small team and haven’t launched yet, so replies might take a little while.',
    ],
  },
  blog: {
    title: 'Blog',
    paragraphs: [
      'Nothing here yet. Once Routicle is further along, we’ll post product updates, creator spotlights and notes on what we’re working on.',
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
    title: 'Terms of Service',
    paragraphs: [
      'This is placeholder text for Routicle’s pre-launch build, not final legal terms. The full Terms of Service will be published before launch.',
      'In short, as currently intended: subscribers get a non-exclusive license to download and use files for the duration described by their plan; creators retain full ownership and copyright of everything they upload and grant Routicle and its subscribers a non-exclusive license to distribute and use it; uploaded work must be the creator’s own, free of client-owned trademarks or confidential material; and accounts may be suspended for uploads that violate these terms.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    paragraphs: [
      'This is placeholder text for Routicle’s pre-launch build, not a final privacy policy. The full Privacy Policy will be published before launch.',
      'As currently intended: Routicle collects the account information needed to run the service (name, email, billing details via its payment processor, and usage data like downloads and generations), does not sell personal data to third parties, and retains data for as long as an account is active plus a reasonable period after for legal and accounting purposes.',
    ],
  },
}

export function getStaticPage(slug) {
  return STATIC_PAGES[slug]
}
