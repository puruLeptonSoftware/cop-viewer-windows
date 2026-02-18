import {
  LATITUDE_RESOLUTION_101,
  LONGITUDE_RESOLUTION_101,
  ALTITUDE_RESOLUTION_101,
  VEIN_RESOLUTION,
  VEIE_RESOLUTION,
  VEIU_RESOLUTION,
  TRUE_HEADING_RESOLUTION,
} from './constants';

export function parseOpcode101(msg: Buffer, _bin?: string) {
  // const hexArray = [
  //   "00",
  //   "65",
  //   "01",
  //   "00",
  //   "00",
  //   "00",
  //   "00",
  //   "7C",
  //   "00",
  //   "00",
  //   "01",
  //   "9C",
  //   "6A",
  //   "77",
  //   "77",
  //   "AB",
  //   "05",
  //   "00",
  //   "00",
  //   "00",
  //   "00",
  //   "00",
  //   "01",
  //   "F4",
  //   "29",
  //   "45",
  //   "6A",
  //   "83",
  //   "3F",
  //   "AD",
  //   "45",
  //   "69",
  //   "0D",
  //   "65",
  //   "F8",
  //   "41",
  //   "F8",
  //   "69",
  //   "DB",
  //   "49",
  //   "75",
  //   "30",
  //   "00",
  //   "00",
  //   "00",
  //   "00",
  //   "01",
  //   "2C",
  //   "07",
  //   "08",
  //   "63",
  //   "BB",
  //   "41",
  //   "2D",
  //   "8A",
  //   "3F",
  //   "1C",
  //   "2A",
  //   "FA",
  //   "C5",
  //   "FA",
  //   "0B",
  //   "6A",
  //   "42",
  //   "1D",
  //   "0C",
  //   "00",
  //   "00",
  //   "00",
  //   "00",
  //   "00",
  //   "C8",
  //   "F9",
  //   "EC",
  //   "3F",
  //   "CC",
  //   "3D",
  //   "46",
  //   "A8",
  //   "2A",
  //   "1A",
  //   "31",
  //   "FB",
  //   "8A",
  //   "F9",
  //   "1F",
  //   "EB",
  //   "AD",
  //   "75",
  //   "30",
  //   "00",
  //   "00",
  //   "00",
  //   "00",
  //   "01",
  //   "90",
  //   "16",
  //   "3F",
  //   "B2",
  //   "97",
  //   "26",
  //   "B1",
  //   "89",
  //   "37",
  //   "2E",
  //   "5C",
  //   "F5",
  //   "90",
  //   "F5",
  //   "B0",
  //   "1E",
  //   "92",
  //   "19",
  //   "97",
  //   "00",
  //   "00",
  //   "00",
  //   "43",
  //   "00",
  //   "00",
  //   "F6",
  //   "E8",
  //   "B1",
  //   "A7",
  //   "36",
  //   "A6",
  //   "04",
  //   "D6",
  //   "11",
  //   "F4",
  //   "09",
  //   "1C",
  //   "07",
  //   "6C",
  //   "C2",
  //   "5B",
  //   "6B",
  //   "D8",
  //   "00",
  //   "00"
  // ];
  
  // // Convert hexArray to a Buffer
  // const hexBuffer = Buffer.from(hexArray.join(''), 'hex');
  
  // // Continue working with hexBuffer instead of overwriting `msg`:
  // msg = hexBuffer;
  
  // Skip 16-byte header
  let byteOffset = 16;
  
  // Read numOfNetworkMembers (1 byte)
  if (byteOffset + 1 > msg.length) {
    console.warn('[UDP] Opcode 101: buffer too short for numOfNetworkMembers');
    return [];
  }
  const numMembers = msg[byteOffset];
  byteOffset += 1;
  
  // Skip 3 reserved bytes
  byteOffset += 3;
  
  const members = [];
  
  for (let i = 0; i < numMembers; i++) {
    // Check if we have enough bytes for a member (24 bytes: 4+4+4+2+2+2+2+2+2)
    if (byteOffset + 24 > msg.length) {
      console.warn(`[UDP] Opcode 101 member ${i}: buffer too short. Need 24 bytes from offset ${byteOffset}, but buffer length is ${msg.length}`);
      break;
    }
    
    // globalId (4 bytes, UINT32)
    const globalId = msg.readUInt32BE(byteOffset);
    byteOffset += 4;
    
    // latitude (4 bytes, INT32 with resolution factor - SIGNED!)
    const latitudeRaw = msg.readInt32BE(byteOffset);
    const latitude = latitudeRaw * LATITUDE_RESOLUTION_101;
    byteOffset += 4;
    
    // longitude (4 bytes, INT32 with resolution factor - SIGNED!)
    const longitudeRaw = msg.readInt32BE(byteOffset);
    const longitude = longitudeRaw * LONGITUDE_RESOLUTION_101;
    byteOffset += 4;
    
    // altitude (2 bytes, INT16 - SIGNED!)
    const altitudeRaw = msg.readInt16BE(byteOffset);
    const altitude = altitudeRaw * ALTITUDE_RESOLUTION_101;
    byteOffset += 2;
    
    // veIn (2 bytes, INT16 - SIGNED!)
    const veInRaw = msg.readInt16BE(byteOffset);
    const veIn = veInRaw * VEIN_RESOLUTION;
    byteOffset += 2;
    
    // veIe (2 bytes, INT16 - SIGNED!)
    const veIeRaw = msg.readInt16BE(byteOffset);
    const veIe = veIeRaw * VEIE_RESOLUTION;
    byteOffset += 2;
    
    // veIu (2 bytes, INT16 - SIGNED!)
    const veIuRaw = msg.readInt16BE(byteOffset);
    const veIu = veIuRaw * VEIU_RESOLUTION;
    byteOffset += 2;
    
    // trueHeading (2 bytes, INT16 - SIGNED!)
    const trueHeadingRaw = msg.readInt16BE(byteOffset);
    const trueHeading = trueHeadingRaw * TRUE_HEADING_RESOLUTION;
    byteOffset += 2;
    
    // reserved (2 bytes, INT16)
    const reserved = msg.readInt16BE(byteOffset);
    byteOffset += 2;
    
    const member = {
      globalId,
      latitude,
      longitude,
      altitude,
      veIn,
      veIe,
      veIu,
      trueHeading,
      reserved,
      opcode: 101,
    };
    
    members.push(member);
  }
  
  return members;
}

