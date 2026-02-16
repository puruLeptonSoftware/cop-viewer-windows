import {
  LATITUDE_RESOLUTION_101,
  LONGITUDE_RESOLUTION_101,
  ALTITUDE_RESOLUTION_101,
  VEIN_RESOLUTION,
  VEIE_RESOLUTION,
  VEIU_RESOLUTION,
  TRUE_HEADING_RESOLUTION,
} from './constants';
import { createReadFunctions } from './helpers';

export function parseOpcode101(msg: Buffer, bin: string) {
  const { readBits, readI16, readU32 } = createReadFunctions(msg, bin);
  
  const numMembers = readBits(128, 8);
  let offset = 160; // Skip header (128 bits) + numMembers (8 bits) + reserved[3] (24 bits) = 160 bits

  const members = [];
  for (let i = 0; i < numMembers; i++) {
    const m = {
      globalId: readU32(offset), // 4 bytes - big-endian
      latitude: readU32(offset + 32) * LATITUDE_RESOLUTION_101, // 4 bytes - big-endian
      longitude: readU32(offset + 64) * LONGITUDE_RESOLUTION_101, // 4 bytes - big-endian
      altitude: readI16(offset + 96) * ALTITUDE_RESOLUTION_101, // 2 bytes - big-endian
      veIn: readI16(offset + 112) * VEIN_RESOLUTION, // 2 bytes - big-endian
      veIe: readI16(offset + 128) * VEIE_RESOLUTION, // 2 bytes - big-endian
      veIu: readI16(offset + 144) * VEIU_RESOLUTION, // 2 bytes - big-endian
      trueHeading: readI16(offset + 160) * TRUE_HEADING_RESOLUTION, // 2 bytes - big-endian
      reserved: readI16(offset + 176), // 2 bytes - big-endian
      opcode: 101,
    };
    members.push(m);
    offset += 192; // 24 bytes = 192 bits per member
  }

  return members;
}

