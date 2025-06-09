import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.join(process.cwd(), 'public/uploads');

// Ensure the upload directory exists (this would ideally be done at server startup)
import fs from 'fs';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Saves an uploaded file to the public uploads directory.
 * @param file The file to save (from FormData).
 * @returns The public URL of the saved file.
 */
export async function saveFile(file: File): Promise<string> {
  const fileExtension = path.extname(file.name);
  const filename = `${uuidv4()}${fileExtension}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  await writeFile(filePath, buffer);

  // Return the public URL
  return `/uploads/${filename}`;
}

/**
 * Deletes a file from the public uploads directory.
 * @param fileUrl The public URL of the file to delete.
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    const filename = path.basename(fileUrl);
    const filePath = path.join(UPLOAD_DIR, filename);
    await unlink(filePath);
  } catch (error: any) {
    // It's often safe to ignore "file not found" errors during deletion
    if (error.code !== 'ENOENT') {
      console.error(`Failed to delete file at ${fileUrl}:`, error);
      // Depending on requirements, you might want to throw the error
      // throw new Error(`Could not delete file: ${fileUrl}`);
    }
  }
} 