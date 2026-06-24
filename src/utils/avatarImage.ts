const MAX_AVATAR_BYTES = 120_000
const MAX_EDGE_PX = 256

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('invalid_image'))
    }
    image.src = objectUrl
  })
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL('image/jpeg', quality)
}

export async function readAvatarFileAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('invalid_image')
  }

  const image = await loadImageFromFile(file)
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('invalid_image')
  context.drawImage(image, 0, 0, width, height)

  let quality = 0.88
  let dataUrl = canvasToDataUrl(canvas, quality)
  while (dataUrl.length > MAX_AVATAR_BYTES && quality > 0.45) {
    quality -= 0.08
    dataUrl = canvasToDataUrl(canvas, quality)
  }

  if (dataUrl.length > MAX_AVATAR_BYTES) {
    throw new Error('avatar_too_large')
  }

  return dataUrl
}
