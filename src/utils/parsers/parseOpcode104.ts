import {
  ALTITUDE_RESOLUTION_101,
  TRUE_HEADING_RESOLUTION,
  GROUND_SPEED_RESOLUTION_102,
} from './constants';

export function parseOpcode104(msg: Buffer) {
  // Skip 16-byte header
  let byteOffset = 16;
  
  // Read numOfTargets (2 bytes, big-endian)
  if (byteOffset + 2 > msg.length) {
    console.warn('[UDP] Opcode 104: buffer too short for numOfTargets');
    return [];
  }
  const numOfTargets = msg.readUInt16BE(byteOffset);
  byteOffset += 2;
  
  // Skip 2 reserved bytes
  byteOffset += 2;
  
  const targets = [];
  
  for (let i = 0; i < numOfTargets; i++) {
    // Check if we have enough bytes for a target (24 bytes: 4+4+4+2+2+2+2+4)
    if (byteOffset + 24 > msg.length) {
      console.warn(`[UDP] Opcode 104 target ${i}: buffer too short. Need 24 bytes from offset ${byteOffset}, but buffer length is ${msg.length}`);
      break;
    }
    
    // Read latitude and longitude as floats (4 bytes each)
    const latitude = msg.readFloatBE(byteOffset + 4);
    const longitude = msg.readFloatBE(byteOffset + 8);
    
    const target = {
      globalId: msg.readUInt32BE(byteOffset), // 4 bytes
      latitude: latitude, // 4 bytes (float)
      longitude: longitude, // 4 bytes (float)
      altitude: msg.readInt16BE(byteOffset + 12) * ALTITUDE_RESOLUTION_101, // 2 bytes (using same resolution as 101)
      heading: msg.readInt16BE(byteOffset + 14) * TRUE_HEADING_RESOLUTION, // 2 bytes (using same resolution as 101)
      groundSpeed: msg.readInt16BE(byteOffset + 16) * GROUND_SPEED_RESOLUTION_102, // 2 bytes (using same resolution as 102)
      // Skip 2 reserved bytes at offset + 18
      range: msg.readUInt32BE(byteOffset + 20), // 4 bytes (raw, no resolution specified)
      opcode: 104,
    };
    
    targets.push(target);
    byteOffset += 24; // Move to next target (4+4+4+2+2+2+2+4 = 24 bytes)
  }
  
  return targets;
}

