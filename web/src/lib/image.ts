/**
 * Shrinks a photo or screenshot before it goes to the AI: about 1600 px on the long edge, JPEG 0.8.
 * It is sent once and never stored. Returns base64 without the "data:" prefix.
 */
export async function toUpload(file: File): Promise<{ mimeType: "image/jpeg"; data: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.8 });
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return { mimeType: "image/jpeg", data: dataUrl.split(",")[1] ?? "" };
}
