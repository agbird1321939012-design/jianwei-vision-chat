import type { ImageAttachment } from "../types";
export async function prepareImage(
  file: File,
  maxSide: number,
): Promise<ImageAttachment> {
  if (file.size > 30 * 1024 * 1024)
    throw new Error(`“${file.name}”超过 30 MB，请先缩小图片`);
  if (file.type && !file.type.startsWith("image/"))
    throw new Error("请选择图片文件");
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(
          new Error(
            `无法读取“${file.name}”。HEIC 或特殊格式请先转为 JPEG、PNG`,
          ),
        );
      img.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight)
      throw new Error("图片尺寸无效");
    const ratio = Math.min(
      1,
      maxSide / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器无法处理图片");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    if (dataUrl.length > 5_000_000)
      throw new Error("压缩后的图片仍过大，请在偏好中降低图片尺寸");
    return {
      id: crypto.randomUUID(),
      name: file.name.slice(0, 300) || "拍摄的图片.jpg",
      dataUrl,
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
