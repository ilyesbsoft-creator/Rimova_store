import { v2 as cloudinary } from "cloudinary";

import type { UploadApiResponse } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadImageOptions {
  folder?: string;
  publicId?: string;
  overwrite?: boolean;
}

export interface UploadedImage {
  publicId: string;
  url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

export interface DeleteImageResult {
  publicId: string;
  result: "ok" | "not found";
}

/**
 * تحويل استجابة Cloudinary إلى كائن موحد.
 */
function mapUploadedImage(
  result: UploadApiResponse,
): UploadedImage {
  return {
    publicId: result.public_id,
    url: result.secure_url,
    format: result.format,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
  };
}

/**
 * رفع صورة إلى Cloudinary.
 */
export async function uploadImage(
  file: string | Buffer,
  options: UploadImageOptions = {},
): Promise<UploadedImage> {
  const {
    folder = "uploads",
    publicId,
    overwrite = false,
  } = options;

  let result: UploadApiResponse;

  if (Buffer.isBuffer(file)) {
    result = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            ...(publicId ? { public_id: publicId } : {}),
            overwrite,
            resource_type: "image",
          },
          (error, uploadResult) => {
            if (error) {
              reject(error);
              return;
            }

            if (!uploadResult) {
              reject(
                new Error(
                  "Cloudinary did not return an upload result.",
                ),
              );
              return;
            }

            resolve(uploadResult);
          },
        );

        stream.end(file);
      },
    );
  } else {
    result = await cloudinary.uploader.upload(file, {
      folder,
      ...(publicId ? { public_id: publicId } : {}),
      overwrite,
      resource_type: "image",
    });
  }

  return mapUploadedImage(result);
}

/**
 * حذف صورة من Cloudinary باستخدام public_id.
 */
export async function deleteImage(
  publicId: string,
): Promise<DeleteImageResult> {
  const normalizedPublicId = publicId.trim();

  if (!normalizedPublicId) {
    throw new Error("Image public_id is required.");
  }

  const result = await cloudinary.uploader.destroy(
    normalizedPublicId,
    {
      resource_type: "image",
      invalidate: true,
    },
  );

  if (
    result.result !== "ok" &&
    result.result !== "not found"
  ) {
    throw new Error(
      `Failed to delete image: ${result.result}`,
    );
  }

  return {
    publicId: normalizedPublicId,
    result: result.result,
  };
}