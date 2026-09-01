import { v2 as cloudinary } from 'cloudinary';

// Configure from env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload an image buffer to Cloudinary
 * @param {Buffer} buffer — Image file buffer
 * @param {string} folder — Cloudinary folder (e.g. 'ceylon-pathways/packages')
 * @param {string} publicId — Optional public ID
 * @returns {Promise<object>} Cloudinary upload result
 */
export async function uploadToCloudinary(buffer, folder = 'ceylon-pathways', publicId = null) {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: 'image',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' }
      ]
    };
    if (publicId) uploadOptions.public_id = publicId;

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Delete an image from Cloudinary by public_id
 */
export async function deleteFromCloudinary(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export default cloudinary;
