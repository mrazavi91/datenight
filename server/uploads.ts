import fs from "fs";
import path from "path";
import multer from "multer";
import { nanoid } from "nanoid";
import { MAX_MEMORY_PHOTOS, MAX_PHOTO_SIZE_BYTES } from "../shared/schema";

export const uploadsDir = path.resolve(import.meta.dirname, "..", "data", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = ALLOWED_TYPES[file.mimetype] ?? path.extname(file.originalname).slice(0, 10);
    cb(null, `${nanoid()}${ext}`);
  },
});

export const photoUpload = multer({
  storage,
  limits: { fileSize: MAX_PHOTO_SIZE_BYTES, files: MAX_MEMORY_PHOTOS },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES[file.mimetype]) {
      cb(new Error("Only JPG, PNG, WEBP, or GIF images are allowed"));
      return;
    }
    cb(null, true);
  },
});

export function deleteUploadedFile(filename: string) {
  const filePath = path.join(uploadsDir, filename);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") console.error("Failed to delete uploaded file", filename, err);
  });
}
