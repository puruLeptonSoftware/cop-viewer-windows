import {
  TRACK_ID_RESOLUTION,
  RADAR_ZONE_COVERAGE_AZ,
  RADAR_ZONE_COVERAGE_EL,
  RADAR_ZONE_CENTER_AZ,
  RADAR_ZONE_CENTER_EL,
  FUEL_RESOLUTION,
} from './constants';

export function parseOpcode102(msg: Buffer) {
  // Read numOfNetworkMembers directly from byte 16 (after 16-byte header)
  const numOfNetworkMembers = msg[16];
  
  // Skip header (16 bytes) + numOfNetworkMembers (1 byte) + reserved[3] (3 bytes) = 20 bytes
  let memberByteOffset = 20;

  const networkMembers = [];

  for (let i = 0; i < numOfNetworkMembers; i++) {
    let byteOffset = memberByteOffset;

    // Check if we have enough bytes for at least the fixed part
    if (byteOffset + 100 > msg.length) {
      console.warn(`[UDP] Opcode 102 member ${i}: buffer too short. Need at least 100 bytes from offset ${byteOffset}, but buffer length is ${msg.length}`);
      break;
    }

    // opcode102B: globalId (4 bytes)
    if (byteOffset + 4 > msg.length) {
      console.warn(`[UDP] Opcode 102 member ${i}: globalId out of bounds at byte ${byteOffset}`);
      break;
    }
    const globalId = msg.readUInt32BE(byteOffset);
    
    // Sanity check: globalId should not be 0 (unless it's a special case, but unlikely)
    if (globalId === 0 && i > 0) {
      console.warn(`[UDP] Opcode 102 member ${i}: globalId is 0, which indicates byte misalignment. Stopping parsing.`);
      break;
    }
    byteOffset += 4;
    
    // callsign (6 bytes)
    const callsignBytes = [];
    for (let j = 0; j < 6; j++) {
      callsignBytes.push(msg[byteOffset + j]);
    }
    const callsign = String.fromCharCode(
      ...callsignBytes.filter((b) => b !== 0)
    ).trim();
    byteOffset += 6;
    
    // callsignId (2 bytes)
    const callsignId = msg.readUInt16BE(byteOffset);
    byteOffset += 2;

    // opcode102F radioData starts here:
    // legacyFreq1 (8 bytes) - D1 to D8
    const legacyFreq1 = {
      D1: msg[byteOffset],
      D2: msg[byteOffset + 1],
      D3: msg[byteOffset + 2],
      D4: msg[byteOffset + 3],
      D5: msg[byteOffset + 4],
      D6: msg[byteOffset + 5],
      D7: msg[byteOffset + 6],
      D8: msg[byteOffset + 7],
    };
    byteOffset += 8;
    
    // legacyFreq2 (8 bytes) - D1 to D8
    const legacyFreq2 = {
      D1: msg[byteOffset],
      D2: msg[byteOffset + 1],
      D3: msg[byteOffset + 2],
      D4: msg[byteOffset + 3],
      D5: msg[byteOffset + 4],
      D6: msg[byteOffset + 5],
      D7: msg[byteOffset + 6],
      D8: msg[byteOffset + 7],
    };
    byteOffset += 8;
    
    // manetLNetId (1 byte)
    const manetLNetId = msg[byteOffset];
    byteOffset += 1;
    
    // manetU1NetId (1 byte)
    const manetU1NetId = msg[byteOffset];
    byteOffset += 1;
    
    // manetU2NetId (1 byte)
    const manetU2NetId = msg[byteOffset];
    byteOffset += 1;
    
    // satcomMode (1 byte)
    const satcomMode = msg[byteOffset];
    byteOffset += 1;
    
    // guardBand (1 byte)
    const guardBand = msg[byteOffset];
    byteOffset += 1;
    
    // reserved[3] (3 bytes) - skip
    byteOffset += 3;

    // opcode102C starts here:
    // isMotherAc (1 byte)
    const isMotherAc = msg[byteOffset];
    byteOffset += 1;
    
    // trackId (2 bytes)
    const trackId = msg.readInt16BE(byteOffset) * TRACK_ID_RESOLUTION;
    byteOffset += 2;
    
    // reserved (1 byte) - skip
    byteOffset += 1;

    // opcode102D starts here:
    // isValid (1 byte)
    const isValid = msg[byteOffset];
    byteOffset += 1;
    
    // role (1 byte)
    const role = msg[byteOffset];
    byteOffset += 1;
    
    // idnTag (1 byte)
    const idnTag = msg[byteOffset];
    byteOffset += 1;
    
    // acCategory (1 byte)
    const acCategory = msg[byteOffset];
    byteOffset += 1;
    
    // isMissionLeader (1 byte)
    const isMissionLeader = msg[byteOffset];
    byteOffset += 1;
    
    // isRogue (1 byte)
    const isRogue = msg[byteOffset];
    byteOffset += 1;
    
    // isFormation (1 byte)
    const isFormation = msg[byteOffset];
    byteOffset += 1;
    
    // recoveryEmergency (1 byte)
    const recoveryEmergency = msg[byteOffset];
    byteOffset += 1;
    
    // displayId (2 bytes)
    const displayId = msg.readUInt16BE(byteOffset);
    byteOffset += 2;
    
    // acType (2 bytes)
    const acType = msg.readUInt16BE(byteOffset);
    byteOffset += 2;
    
    // bimg (2 bytes)
    const bimg = msg.readUInt16BE(byteOffset);
    byteOffset += 2;
    
    // timg (2 bytes)
    const timg = msg.readUInt16BE(byteOffset);
    byteOffset += 2;
    
    // c2Critical (1 byte)
    const c2Critical = msg[byteOffset];
    byteOffset += 1;
    
    // controllingNodeId (1 byte)
    const controllingNodeId = msg[byteOffset];
    byteOffset += 1;
    
    // reserved (1 byte) - skip
    byteOffset += 1;
    
    // ctn (5 bytes)
    const ctnBytes = [];
    for (let j = 0; j < 5; j++) {
      ctnBytes.push(msg[byteOffset + j]);
    }
    const ctn = String.fromCharCode(
      ...ctnBytes.filter((b) => b !== 0)
    ).trim();
    byteOffset += 5;
    
    // opcode102G metadata (8 bytes) - store plain, don't process
    const baroAltitudeRaw = msg.readInt16BE(byteOffset); // 2 bytes - store raw
    byteOffset += 2;
    const groundSpeedRaw = msg.readInt16BE(byteOffset); // 2 bytes - store raw
    byteOffset += 2;
    const machRaw = msg.readInt16BE(byteOffset); // 2 bytes - store raw
    byteOffset += 2;
    // reserved[2] (2 bytes) - skip
    byteOffset += 2;

    // opcode102E starts here:
    // isValid (1 byte)
    const battleIsValid = msg[byteOffset];
    byteOffset += 1;
    
    // q1LockFinalizationState (1 byte)
    const q1LockFinalizationState = msg[byteOffset];
    byteOffset += 1;
    
    // q2LockFinalizationState (1 byte)
    const q2LockFinalizationState = msg[byteOffset];
    byteOffset += 1;
    
    // fuelState (1 byte)
    const fuelState = msg[byteOffset];
    byteOffset += 1;
    
    // q1LockGlobalId (4 bytes)
    const q1LockGlobalId = msg.readUInt32BE(byteOffset);
    byteOffset += 4;
    
    // q2LockGlobalId (4 bytes)
    const q2LockGlobalId = msg.readUInt32BE(byteOffset);
    byteOffset += 4;
    
    // radarLockGlobalId (4 bytes)
    const radarLockGlobalId = msg.readUInt32BE(byteOffset);
    byteOffset += 4;
    
    // radarZoneCoverageAz (1 byte)
    const radarZoneCoverageAz = msg[byteOffset] * RADAR_ZONE_COVERAGE_AZ;
    byteOffset += 1;
    
    // radarZoneCoverageEl (1 byte)
    const radarZoneCoverageEl = msg[byteOffset] * RADAR_ZONE_COVERAGE_EL;
    byteOffset += 1;
    
    // radarZoneCenterAz (1 byte)
    const radarZoneCenterAz = msg[byteOffset] * RADAR_ZONE_CENTER_AZ;
    byteOffset += 1;
    
    // radarZoneCenterEl (1 byte)
    const radarZoneCenterEl = msg[byteOffset] * RADAR_ZONE_CENTER_EL;
    byteOffset += 1;
    
    // combatEmergency (1 byte)
    const combatEmergency = msg[byteOffset];
    byteOffset += 1;
    
    // chaffRemaining (1 byte)
    const chaffRemaining = msg[byteOffset];
    byteOffset += 1;
    
    // flareRemaining (1 byte)
    const flareRemaining = msg[byteOffset];
    byteOffset += 1;
    
    // masterArmStatus (1 byte)
    const masterArmStatus = msg[byteOffset];
    byteOffset += 1;
    
    // acsStatus (1 byte)
    const acsStatus = msg[byteOffset];
    byteOffset += 1;
    
    // fuel (1 byte)
    const fuel = msg[byteOffset] * FUEL_RESOLUTION;
    byteOffset += 1;
    
    // CRITICAL: Read numOfWeapons (1 byte) - track this!
    const numOfWeapons = msg[byteOffset];
    byteOffset += 1;
    
    // CRITICAL: Read numofSensors (1 byte) - track this!
    const numofSensors = msg[byteOffset];
    byteOffset += 1;

    // Sanity check to prevent corrupted data
    if (numofSensors > 64 || numOfWeapons > 64) {
      console.warn(
        `[UDP] Opcode 102 member ${i} invalid counts: numOfWeapons=${numOfWeapons}, numofSensors=${numofSensors} at byteOffset=${byteOffset}. This indicates byte misalignment.`
      );
      console.warn(`[UDP] Stopping parsing at member ${i} due to invalid counts. Previous member size calculation may be incorrect.`);
      break;
    }
    
    // Check if we have enough buffer space for variable-length data
    const variableDataSize = (numOfWeapons * 4) + (numofSensors * 4);
    if (byteOffset + variableDataSize > msg.length) {
      console.warn(
        `[UDP] Opcode 102 member ${i}: not enough buffer space. Need ${variableDataSize} bytes for variable data at byteOffset=${byteOffset}, but buffer length is ${msg.length}`
      );
      break;
    }

    // Read weaponsData: 4 bytes × numOfWeapons
    // Each weapon: code (1 byte), value (1 byte), reserved (2 bytes - skip, don't store)
    const weaponsData = [];
    for (let w = 0; w < numOfWeapons; w++) {
      if (byteOffset + 4 > msg.length) {
        console.warn(`[UDP] Opcode 102 member ${i} weapon ${w} out of bounds`);
        break;
      }
      weaponsData.push({
        code: msg[byteOffset],
        value: msg[byteOffset + 1],
        // reserved: skip 2 bytes, don't store
      });
      byteOffset += 4; // Advance by 4 bytes total (code + value + 2 reserved)
    }

    // Read sensorsData: 4 bytes × numofSensors
    // Each sensor: code (1 byte), value (1 byte), reserved (2 bytes - skip, don't store)
    const sensorsData = [];
    for (let s = 0; s < numofSensors; s++) {
      if (byteOffset + 4 > msg.length) {
        console.warn(`[UDP] Opcode 102 member ${i} sensor ${s} out of bounds at byteOffset=${byteOffset}, buffer length=${msg.length}`);
        break;
      }
      sensorsData.push({
        code: msg[byteOffset],
        value: msg[byteOffset + 1],
        // reserved: skip 2 bytes, don't store
      });
      byteOffset += 4; // Advance by 4 bytes total (code + value + 2 reserved)
    }
    
    // Final bounds check before updating memberByteOffset
    if (byteOffset > msg.length) {
      console.warn(`[UDP] Opcode 102 member ${i}: final byteOffset ${byteOffset} exceeds buffer length ${msg.length}. Stopping parsing.`);
      break;
    }

    // Calculate member size
    const memberSize = byteOffset - memberByteOffset;
    const expectedSize = 95 + (numOfWeapons * 4) + (numofSensors * 4);
    
    // Verify the size makes sense
    if (Math.abs(memberSize - expectedSize) > 5) {
      console.warn(`[UDP] Member ${i} size mismatch: actual=${memberSize}, expected=${expectedSize}, difference=${memberSize - expectedSize}. This may indicate parsing error.`);
    }

    const member = {
      globalId,
      callsign,
      callsignId,
      radioData: {
        legacyFreq1,
        legacyFreq2,
        manetLNetId,
        manetU1NetId,
        manetU2NetId,
        satcomMode,
        guardBand,
      },
      internalData: {
        isMotherAc,
        trackId,
      },
      regionalData: {
        isValid,
        role,
        idnTag,
        acCategory,
        isMissionLeader,
        isRogue,
        isFormation,
        recoveryEmergency,
        displayId,
        acType,
        bimg,
        timg,
        c2Critical,
        controllingNodeId,
        ctn,
        metadata: {
          // Store raw values, don't multiply by resolution
          baroAltitude: baroAltitudeRaw,
          groundSpeed: groundSpeedRaw,
          mach: machRaw,
        },
      },
      battleGroupData: {
        isValid: battleIsValid,
        q1LockFinalizationState,
        q2LockFinalizationState,
        fuelState,
        q1LockGlobalId,
        q2LockGlobalId,
        radarLockGlobalId,
        radarZoneCoverageAz,
        radarZoneCoverageEl,
        radarZoneCenterAz,
        radarZoneCenterEl,
        combatEmergency,
        chaffRemaining,
        flareRemaining,
        masterArmStatus,
        acsStatus,
        fuel,
        numOfWeapons,
        numOfSensors: numofSensors,
        weaponsData,
        sensorsData,
      },
      opcode: 102,
    };

    networkMembers.push(member);
    
    // Update offset for next member - this is critical!
    memberByteOffset = byteOffset;
  }

  return networkMembers;
}

