export function parseOpcode106(msg: Buffer) {
  // Skip 16-byte header
  debugger
  let byteOffset = 16;
  
  // Read senderGlobalId (4 bytes, big-endian)
  if (byteOffset + 4 > msg.length) {
    console.warn('[UDP] Opcode 106: buffer too short for senderGlobalId');
    return [];
  }
  const senderGlobalId = msg.readUInt32BE(byteOffset);
  byteOffset += 4;
  
  // Read numOfThreats (1 byte)
  if (byteOffset + 1 > msg.length) {
    console.warn('[UDP] Opcode 106: buffer too short for numOfThreats');
    return [];
  }
  const numOfThreats = msg.readUInt8(byteOffset);
  byteOffset += 1;
  
  // Skip 3 reserved bytes
  byteOffset += 3;
  
  const threats = [];
  
  for (let i = 0; i < numOfThreats; i++) {
    // Check if we have enough bytes for a threat (12 bytes: 1+1+1+1+1+3+2+2)
    if (byteOffset + 12 > msg.length) {
      console.warn(`[UDP] Opcode 106 threat ${i}: buffer too short. Need 12 bytes from offset ${byteOffset}, but buffer length is ${msg.length}`);
      break;
    }
    
    const threat = {
      senderGlobalId,
      threatId: msg.readUInt8(byteOffset), // 1 byte
      isSearchMode: msg.readUInt8(byteOffset + 1), // 1 byte
      isLockOn: msg.readUInt8(byteOffset + 2), // 1 byte
      threatType: msg.readUInt8(byteOffset + 3), // 1 byte
      threatRange: msg.readUInt8(byteOffset + 4), // 1 byte (in meters)
      // Skip 3 reserved bytes at offset + 5
      threatAzimuth: msg.readUInt16BE(byteOffset + 8), // 2 bytes (big-endian, in degrees)
      threatFrequency: msg.readUInt16BE(byteOffset + 10), // 2 bytes (big-endian)
      opcode: 106,
    };
    
    threats.push(threat);
    byteOffset += 12; // Move to next threat
  }
  
  return threats;
}

