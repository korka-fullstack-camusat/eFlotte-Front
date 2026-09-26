/**
 * Réduit une photo prise au téléphone (souvent 3–8 Mo) avant l'envoi :
 * plus grand côté ramené à `maxSize` px, ré-encodée en JPEG.
 * Les navigateurs récents appliquent l'orientation EXIF en dessinant l'<img>.
 */
export async function compresserImage(file: File, maxSize = 1600, qualite = 0.72): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Image illisible"));
      i.src = url;
    });
    const ratio = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * ratio);
    canvas.height = Math.round(img.naturalHeight * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", qualite));
    return blob && blob.size < file.size ? blob : file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
