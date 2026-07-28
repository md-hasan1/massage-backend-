import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../../config';
import { AppError } from '../../utils/AppError';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

// Ensure temporary uploads directory exists
const tempUploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

// Multer Storage Configuration (storing files temporarily on disk)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// File filter validation
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow all types of documents, audio, and images
  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.mp3', '.m4a', '.wav', '.ogg', '.pdf', '.doc', '.docx', '.txt', '.zip', '.mp4'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError('Unsupported file format', 400));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit to 10MB
  },
});

/**
 * Uploads a local file to Cloudinary and deletes the temporary file.
 * Falls back to local serving if Cloudinary is not configured.
 */
export const uploadFile = async (
  localFilePath: string,
  fileName: string,
  reqHost: string
): Promise<string> => {
  try {
    if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
      // Upload to Cloudinary
      const response = await cloudinary.uploader.upload(localFilePath, {
        folder: 'chatapp_attachments',
        resource_type: 'auto',
        original_filename: path.basename(fileName, path.extname(fileName)),
      });

      // Cleanup local temp file asynchronously
      fs.unlink(localFilePath, () => {});

      return response.secure_url;
    } else {
      // Local fallback: Serve file statically
      const relativePath = path.basename(localFilePath);
      const fileUrl = `${reqHost}/uploads/${relativePath}`;
      return fileUrl;
    }
  } catch (error: any) {
    // Make sure we delete local file even on failure
    if (fs.existsSync(localFilePath)) {
      fs.unlink(localFilePath, () => {});
    }
    throw new AppError(`File upload failed: ${error.message}`, 500);
  }
};
