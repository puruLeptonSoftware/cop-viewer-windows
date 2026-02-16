import {
  DMAX1_RESOLUTION,
  DMAX2_RESOLUTION,
  DMIN_RESOLUTION,
} from './constants';

export function parseOpcode103(msg: Buffer) {
  // Read numOfEngagingNetworkMember from byte 16 (after 16-byte header)
  const numOfEngagingNetworkMember = msg[16];
  
  // Skip header (16 bytes) + numOfEngagingNetworkMember (1 byte) + reserved[3] (3 bytes) = 20 bytes
  let byteOffset = 20;

  const engagements = [];

  for (let i = 0; i < numOfEngagingNetworkMember; i++) {
    // Check if we have enough bytes for an engagement (20 bytes)
    if (byteOffset + 20 > msg.length) {
      console.warn(`[UDP] Opcode 103 engagement ${i}: buffer too short. Need 20 bytes from offset ${byteOffset}, but buffer length is ${msg.length}`);
      break;
    }

    // globalId (4 bytes)
    const globalId = msg.readUInt32BE(byteOffset);
    byteOffset += 4;
    
    // engagementTargetGid (4 bytes)
    const engagementTargetGid = msg.readUInt32BE(byteOffset);
    byteOffset += 4;
    
    // weaponLaunch (1 byte)
    const weaponLaunch = msg[byteOffset];
    byteOffset += 1;
    
    // hangFire (1 byte)
    const hangFire = msg[byteOffset];
    byteOffset += 1;
    
    // tth (1 byte)
    const tth = msg[byteOffset];
    byteOffset += 1;
    
    // tta (1 byte)
    const tta = msg[byteOffset];
    byteOffset += 1;
    
    // engagementTargetWeaponCode (1 byte)
    const engagementTargetWeaponCode = msg[byteOffset];
    byteOffset += 1;
    
    // reserved (1 byte) - skip
    byteOffset += 1;
    
    // dMax1 (2 bytes) - UINT16 big-endian
    const dMax1Raw = msg.readUInt16BE(byteOffset);
    const dMax1 = isNaN(dMax1Raw) ? NaN : dMax1Raw * DMAX1_RESOLUTION;
    byteOffset += 2;
    
    // dMax2 (2 bytes) - UINT16 big-endian
    const dMax2Raw = msg.readUInt16BE(byteOffset);
    const dMax2 = isNaN(dMax2Raw) ? NaN : dMax2Raw * DMAX2_RESOLUTION;
    byteOffset += 2;
    
    // dmin (2 bytes) - UINT16 big-endian
    const dminRaw = msg.readUInt16BE(byteOffset);
    const dmin = isNaN(dminRaw) ? NaN : dminRaw * DMIN_RESOLUTION;
    byteOffset += 2;

    const engagement = {
      globalId,
      engagementTargetGid,
      weaponLaunch,
      hangFire,
      tth,
      tta,
      engagementTargetWeaponCode,
      dMax1,
      dMax2,
      dmin,
      opcode: 103,
    };

    engagements.push(engagement);
  }

  return engagements;
}
