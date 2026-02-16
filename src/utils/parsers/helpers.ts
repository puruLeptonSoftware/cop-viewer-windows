export function createReadFunctions(msg: Buffer, bin: string) {
  const readBits = (start: number, len: number) => {
    if (start < 0 || start >= bin.length) {
      console.warn(`[UDP] Invalid readBits start: ${start}, buffer length: ${bin.length}`);
      return 0;
    }
    if (start + len > bin.length) {
      console.warn(`[UDP] Buffer overflow: reading ${len} bits at offset ${start}, buffer length: ${bin.length}`);
      const available = bin.length - start;
      const bits = bin.slice(start) + '0'.repeat(len - available);
      return parseInt(bits, 2);
    }
    return parseInt(bin.slice(start, start + len), 2);
  };

  const readI16 = (start: number) => {
    const byteOffset = Math.floor(start / 8);
    if (byteOffset + 2 > msg.length) {
      console.warn(`[UDP] INT16 out of bounds at byte ${byteOffset}`);
      return 0;
    }
    return msg.readInt16BE(byteOffset);
  };

  const readU32 = (start: number) => {
    const byteOffset = Math.floor(start / 8);
    if (byteOffset + 4 > msg.length) {
      console.warn(`[UDP] UINT32 out of bounds at byte ${byteOffset}`);
      return 0;
    }
    return msg.readUInt32BE(byteOffset);
  };

  const readU16 = (start: number) => {
    const byteOffset = Math.floor(start / 8);
    if (byteOffset + 2 > msg.length) {
      console.warn(`[UDP] UINT16 out of bounds at byte ${byteOffset}`);
      return 0;
    }
    return msg.readUInt16BE(byteOffset);
  };

  return { readBits, readI16, readU32, readU16 };
}

