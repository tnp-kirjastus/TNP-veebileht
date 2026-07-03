import "server-only";

import { inflateRawSync } from "node:zlib";

const LOCAL_FILE_SIG = 0x04034b50;
const CENTRAL_DIR_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

export interface ZipEntry {
  filename: string;
  buffer: Buffer;
}

function readU32(buf: Buffer, offset: number): number {
  return buf.readUInt32LE(offset);
}
function readU16(buf: Buffer, offset: number): number {
  return buf.readUInt16LE(offset);
}

export function extractZip(buf: Buffer, maxTotalSize: number = 500 * 1024 * 1024): ZipEntry[] {
  const entries: ZipEntry[] = [];

  let eocdOffset = buf.length - 22;
  while (eocdOffset >= 0) {
    if (readU32(buf, eocdOffset) === EOCD_SIG) break;
    eocdOffset--;
  }
  if (eocdOffset < 0) throw new Error("Vigane ZIP-fail: EOCD ei leitud");

  const centralDirOffset = readU32(buf, eocdOffset + 16);
  const centralDirSize = readU32(buf, eocdOffset + 12);
  const totalEntries = readU16(buf, eocdOffset + 10);

  if (totalEntries > 10000) throw new Error("Liiga palju kirjeid ZIP-failis");

  let centralPos = 0;
  let totalExpanded = 0;

  for (let i = 0; i < totalEntries; i++) {
    const pos = centralDirOffset + centralPos;
    if (pos + 46 > buf.length) break;

    const sig = readU32(buf, pos);
    if (sig !== CENTRAL_DIR_SIG) break;

    const compression = readU16(buf, pos + 10);
    const crc32 = readU32(buf, pos + 16);
    const compressedSize = readU32(buf, pos + 20);
    const uncompressedSize = readU32(buf, pos + 24);
    const filenameLen = readU16(buf, pos + 28);
    const extraLen = readU16(buf, pos + 30);
    const commentLen = readU16(buf, pos + 32);
    const localHeaderOffset = readU32(buf, pos + 42);

    const filename = buf.subarray(pos + 46, pos + 46 + filenameLen).toString("utf-8");
    centralPos += 46 + filenameLen + extraLen + commentLen;

    if (filename.endsWith("/") || filename.includes("..") || filename.startsWith("/")) continue;
    const cleanName = filename.replace(/\\/g, "/").split("/").pop();
    if (!cleanName) continue;

    if (uncompressedSize > 30 * 1024 * 1024) continue;
    if (compressedSize > 40 * 1024 * 1024) continue;

    const localPos = localHeaderOffset + 30 + readU16(buf, localHeaderOffset + 26) + readU16(buf, localHeaderOffset + 28);
    const dataStart = localPos;
    const dataEnd = dataStart + (compression === 0 ? uncompressedSize : compressedSize);

    if (dataEnd > buf.length) continue;

    let fileData: Buffer;
    try {
      if (compression === 0) {
        fileData = buf.subarray(dataStart, dataEnd);
      } else if (compression === 8) {
        fileData = inflateRawSync(buf.subarray(dataStart, dataEnd));
      } else {
        continue;
      }
    } catch {
      continue;
    }

    totalExpanded += fileData.length;
    if (totalExpanded > maxTotalSize) throw new Error("ZIP-i lahtipakitud maht ületab piiri");

    entries.push({ filename: cleanName, buffer: fileData });
  }

  return entries;
}
