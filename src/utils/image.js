/**
 * Reads an image file, crops it to a centred square and re-encodes it at
 * `size`px as a JPEG data URL.
 *
 * Avatars live on the user record rather than in object storage (the presign
 * endpoint is creator-scoped, so it can't serve every account), so a photo
 * straight off a phone — several megabytes, arbitrary aspect ratio — has to be
 * cropped and shrunk here before it's saved.
 */
export function squareImageDataUrl(file, size = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const side = Math.min(img.naturalWidth, img.naturalHeight)
      if (!side) {
        reject(new Error('That image could not be read.'))
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      // JPEG has no alpha channel, so a transparent PNG would encode as black
      // without a background painted underneath it first.
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('That image could not be read.'))
    }

    img.src = objectUrl
  })
}
