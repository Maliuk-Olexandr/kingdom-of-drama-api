import { Readable } from 'node:stream';

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  secure: true,
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function saveAvatarToCloudinary(buffer, folderName, fileName) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `kingdom-of-drama/users/${folderName}`,
        public_id: fileName,
        resource_type: 'image',
        overwrite: true,
        use_filename: false,
        invalidate: true,
      },
      (error, result) => (error ? reject(error) : resolve(result)),
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}
