import "server-only";
import fs from "node:fs";
import path from "node:path";
import { newId } from "./db";
import { UPLOADS_DIR } from "./paths";
import type { ImageAttachment } from "@/lib/types";

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

export function saveUpload(img: ImageAttachment): string {
  const ext = EXT[img.mediaType];
  if (!ext) throw new Error(`Unsupported image type ${img.mediaType}`);
  const id = `${newId(16)}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, id), Buffer.from(img.data, "base64"));
  return id;
}

export function loadUpload(id: string): { data: Buffer; mediaType: string } | null {
  if (!/^[a-z0-9]+\.(png|jpg|webp|gif)$/.test(id)) return null;
  const file = path.join(UPLOADS_DIR, id);
  if (!fs.existsSync(file)) return null;
  const ext = id.split(".").pop()!;
  const mediaType = Object.entries(EXT).find(([, e]) => e === ext)![0];
  return { data: fs.readFileSync(file), mediaType };
}
