/**
 * A content thumbnail that prefers the WebP variant when there is one.
 *
 * The browser picks the first <source> it can decode, so every current browser
 * gets the smaller WebP and anything older falls back to the original JPEG or
 * PNG. The variant only ever affects what the feed and detail view *display* —
 * the file a subscriber downloads is the creator's original source, untouched.
 *
 * Lazy by default: the feed is a long image grid, and fetching every thumbnail
 * up front is most of what makes a first visit feel slow. Pass
 * `loading="eager"` for the one image that is the page's main content.
 */
export default function Thumb({ item, src, webp, alt = '', loading = 'lazy', ...rest }) {
  const original = src ?? item?.image
  const variant = webp ?? item?.imageWebp

  const img = <img src={original} alt={alt} loading={loading} decoding="async" {...rest} />
  if (!variant) return img

  return (
    <picture className="thumb-picture">
      <source type="image/webp" srcSet={variant} />
      {img}
    </picture>
  )
}
