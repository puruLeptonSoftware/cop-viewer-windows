import {
  LATITUDE_RESOLUTION_101,
  LONGITUDE_RESOLUTION_101,
  ALTITUDE_RESOLUTION_101,
  TRUE_HEADING_RESOLUTION,
  GROUND_SPEED_RESOLUTION_102,
} from './constants';

export function parseOpcode104(msg: Buffer) {
  // Skip 16-byte header
  let byteOffset = 16;
//   console.log("TOTAL: ", msg[0]);

//   // Sample hex data as a string array, you should convert it into a Buffer
//   const hexArray = [
//     "00",
//     "68",
//     "01",
//     "00",
//     "00",
//     "00",
//     "01",
//     "0C",
//     "00",
//     "00",
//     "01",
//     "9C",
//     "6A",
//     "77",
//     "79",
//     "1C",
//     "00",
//     "0B",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "01",
//     "09",
//     "76",
//     "D8",
//     "6C",
//     "3A",
//     "87",
//     "A2",
//     "0F",
//     "05",
//     "ED",
//     "87",
//     "0D",
//     "07",
//     "66",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "06",
//     "0D",
//     "44",
//     "45",
//     "A0",
//     "26",
//     "B9",
//     "5B",
//     "26",
//     "09",
//     "B7",
//     "8E",
//     "43",
//     "03",
//     "F2",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "03",
//     "04",
//     "36",
//     "44",
//     "B8",
//     "2F",
//     "7E",
//     "06",
//     "04",
//     "04",
//     "E3",
//     "91",
//     "9F",
//     "04",
//     "EE",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "04",
//     "28",
//     "29",
//     "35",
//     "85",
//     "36",
//     "8C",
//     "11",
//     "15",
//     "03",
//     "82",
//     "B0",
//     "B4",
//     "02",
//     "13",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "05",
//     "11",
//     "26",
//     "E2",
//     "FB",
//     "34",
//     "A4",
//     "6F",
//     "28",
//     "06",
//     "26",
//     "6F",
//     "49",
//     "04",
//     "D5",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "0A",
//     "24",
//     "3A",
//     "15",
//     "84",
//     "22",
//     "E6",
//     "7E",
//     "01",
//     "09",
//     "DB",
//     "53",
//     "CB",
//     "05",
//     "B5",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "02",
//     "1B",
//     "7C",
//     "B7",
//     "F4",
//     "4A",
//     "BD",
//     "44",
//     "C7",
//     "04",
//     "98",
//     "68",
//     "35",
//     "01",
//     "17",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "07",
//     "29",
//     "03",
//     "FF",
//     "49",
//     "3D",
//     "33",
//     "F8",
//     "BB",
//     "08",
//     "B3",
//     "96",
//     "2B",
//     "08",
//     "EC",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "08",
//     "00",
//     "98",
//     "10",
//     "B2",
//     "24",
//     "AF",
//     "27",
//     "7A",
//     "07",
//     "33",
//     "94",
//     "20",
//     "09",
//     "D1",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "43",
//     "00",
//     "09",
//     "0A",
//     "34",
//     "EE",
//     "66",
//     "35",
//     "99",
//     "DA",
//     "86",
//     "05",
//     "89",
//     "E3",
//     "C0",
//     "04",
//     "CB",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "43",
//     "00",
//     "02",
//     "1B",
//     "7C",
//     "F6",
//     "A4",
//     "4A",
//     "BC",
//     "F6",
//     "9D",
//     "04",
//     "98",
//     "DF",
//     "95",
//     "09",
//     "79",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00",
//     "00"
// ];

//   // Convert hexArray to a Buffer
//   const hexBuffer = Buffer.from(hexArray.join(''), 'hex');

//   // Continue working with hexBuffer instead of overwriting `msg`:
//   msg = hexBuffer;  // Only use this if you have to use the `hexBuffer`


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
  
    // globalId (4 bytes)
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
    
    // altitude (2 bytes, INT16)
    const altitudeRaw = msg.readInt16BE(byteOffset);
    const altitude = altitudeRaw * ALTITUDE_RESOLUTION_101;
    byteOffset += 2;
    
    // heading (2 bytes, INT16)
    const headingRaw = msg.readInt16BE(byteOffset);
    const heading = headingRaw * TRUE_HEADING_RESOLUTION;
    byteOffset += 2;
    
    // groundSpeed (2 bytes, INT16)
    const groundSpeedRaw = msg.readInt16BE(byteOffset);
    const groundSpeed = groundSpeedRaw * GROUND_SPEED_RESOLUTION_102;
    byteOffset += 2;
    
    // reserved[2] (2 bytes) - skip
    byteOffset += 2;
    
    // range (4 bytes, UINT32)
    const range = msg.readUInt32BE(byteOffset);
    byteOffset += 4;
    
    const target = {
      globalId,
      latitude,
      longitude,
      altitude,
      heading,
      groundSpeed,
      range,
      opcode: 104,
    };
    
    targets.push(target);
  }
  
  return targets;
}

