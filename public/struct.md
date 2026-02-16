# Opcode Structures and Sizes

This document provides an overview of all opcodes, their structures, and expected buffer sizes.

## Overview

Each opcode consists of:

1. A **16-byte header** (common to all opcodes)
2. Opcode-specific data
3. Dynamic vector/list fields

## Opcode 101: Network Member Positions

**Structure:** `opcode101` → `vector<opcode101A>`

### opcode101A (24 bytes per member)

```
  UINT32 globalId;    // 4 bytes
  float latitude;     // 4 bytes
  float longitude;    // 4 bytes
  UINT16 altitude;    // 2 bytes
  UINT16 veIn;        // 2 bytes
  UINT16 veIe;        // 2 bytes
  UINT16 veIu;        // 2 bytes
  UINT16 trueHeading; // 2 bytes
  INT16 reserved;     // 2 bytes
```

**Size:** 16 (header) + 4 (numOfNetworkMembers + reserved[3]) + (24 × N members)

16bytes + 1byte(opcodedata) + 1byte(for network members count) + 3bytes(reserved) + (variable size based on the data) * n 

## Opcode 102: Network Member Detailed Data

header -> 1byte message count 
2nd byte opcode


**Structure:** `opcode102` → `vector<opcode102A>`

### opcode102A (variable size, ~200+ bytes per member)

#### opcode102B (36 bytes)

```
  UINT32 globalId; //4 
  char callsign[6]; //6
  UINT16 callsignId;//2
  opcode102F radioData; // 24 bytes
```

#### opcode102F (24 bytes)

```
  opcode102J legacyFreq1; // 8 bytes
  opcode102J legacyFreq2; // 8 bytes
  UINT8 manetLNetId; // 1
  UINT8 manetU1NetId; 1
  UINT8 manetU2NetId; 1 
  UINT8 satcomMode; 1
  UINT8 guardBand; 1
  UINT8 reserved[3]; 3
```

#### opcode102J (8 bytes)
```
    UINT8 D1 
    UINT8 D2
    UINT8 D3 
    UINT8 D4
    UINT8 D5 
    UINT8 D6 
    UINT D7
    UINT D8
```

#### opcode102C (4 bytes)

```
  UINT8 isMotherAc; 1
  UINT trackId; // 2 bytes
  UINT8 reserved; 1
```

#### opcode102D (variable, base 28 bytes)

```
  UINT8 isValid;
  UINT8 role;
  UINT8 idnTag;
  UINT8 acCategory;
  UINT8 isMissionLeader;
  UINT8 isRogue;
  UINT8 isFormation;
  UINT8 recoveryEmergency;
  UINT16 displayId;
  UINT16 acType;
  UINT16 bimg;
  UINT16 timg;
  UINT8 c2Critical;
  UINT8 controllingNodeId;
  UINT8 reserved;
  char ctn[5];
  opcode102G metadata; // 8 bytes
```

#### opcode102E (variable, base 27 bytes)

```
  UINT8 isValid; 1
  UINT8 q1LockFinalizationState; 1
  UINT8 q2LockFinalizationState; 1
  UINT8 fuelState; 1
  UINT32 q1LockGlobalId; 4
  UINT32 q2LockGlobalId; 4
  UINT32 radarLockGlobalId; 4
  UINT8 radarZoneCoverageAz; 1
  UINT8 radarZoneCoverageEl; 1
  UINT8 radarZoneCenterAz; 1
  UINT8 radarZoneCenterEl; 1
  UINT8 combatEmergency; 1
  UINT8 chaffRemaining; 1
  UINT8 flareRemaining; 1
  UINT8 masterArmStatus; 1
  UINT8 acsStatus; 1
  UINT8 fuel; 1
  UINT8 numOfWeapons; 1
  UINT8 numofSensors; 1
  std::vector<opcode102H> weaponsData;  // + (4 × N) bytes
  std::vector<opcode102I> sensorsData;  // + (4 × N) bytes
```

#### opcode102H (4 bytes each)

```
  UINT8 code (1byte);
  UINT8 value (1byte);
  UINT16 reserved (2byte);
```

#### opcode102I (4 bytes each)

```
  UINT8 code (1byte);
  UINT8 value (1byte);
  UINT16 reserved (2byte);
```

**Size:** 16 (header) + 4 (numOfNetworkMembers + reserved[3]) + (variable × N members)

## Opcode 103: Engagement Data

**Structure:** `opcode103` → `vector<opcode103A>`

### opcode103A (20 bytes per member)

```
  UINT32 globalId;
  UINT32 engagementTargetGid;
  UINT8 weaponLaunch;
  UINT8 hangFire;
  UINT8 tth;
  UINT8 tta;
  UINT8 engagementTargetWeaponCode;
  UINT8 reserved;
  UINT16 dMax1;
  UINT16 dMax2;
  UINT16 dmin;
```

**Size:** 16 (header) + 4 (numOfEngagingNetworkMember + reserved[3]) + (20 × N members)

## Opcode 104: Target Positions

**Structure:** `opcode104` → `vector<opcode104A>`

### opcode104A (30 bytes per target)

```
  UINT32 globalId;    // 4 bytes
  float latitude;     // 4 bytes
  float longitude;    // 4 bytes
  INT16 altitude;     // 2 bytes
  INT16  heading;      // 2 bytes
  INT16 groundSpeed;  // 2 bytes
  UINT8 reserved[2];  // 2 bytes
  UINT32 range;        // 4 bytes
```

**Size:** 16 (header) + 4 (numOfTargets + reserved[2]) + (30 × N targets)

## Opcode 105: Target Detailed Data

**Structure:** `opcode105` → `vector<opcode105A>`

### opcode105A (variable, base 40 bytes)

```
  UINT32 globalId;
  UINT16 displayId;
  char callSign[6];
  UINT16 callsignId;
  UINT8 iffSensor;
  UINT8 trackSource;
  UINT8 grouped;
  UINT8 isLocked;
  UINT16 localTrackNumber;
  UINT32 saLeader;
  UINT16 acType;
  UINT8 acCategory;
  UINT8 nodeId;
  UINT8 idnTag;
  UINT8 nctr;
  UINT8 jam;
  UINT8 numOfContributors;
  UINT8 lno;
  char ctn[5];
  UINT8 reserved[2];
  std::vector<opcode105B> contributors; // + (4 × N) bytes
```

### opcode105B (4 bytes)

```
  UINT16 displayId;
  UINT8 lno;
  UINT8 reserved;
```

**Size:** 16 (header) + 4 (numOfTargets + reserved[2]) + (variable × N targets)

## Opcode 106: Threat Data

**Structure:** `opcode106` → `vector<opcode106A>`

### opcode106A (12 bytes per threat)

```
  UINT8 threatId;
  UINT8 isSearchMode;
  UINT8 isLockOn;
  UINT8 threatType;
  UINT8 threatRange;
  UINT8 reserved[3];
  UINT16 threatAzimuth;
  UINT16 threatFrequency;
```

**Size:** 16 (header) + 8 (senderGlobalId (4byte) + numOfThreats (1byte) + reserved[3]) + (12 × N threats)

## Opcode 122: Message/Geo Data

**Structure:** `opcode122` (fixed size)

```
  Header header;      // 16 bytes
  UINT32 globalId;    // 4 bytes
  UINT32 messageId;   // 4 bytes
  UINT32 senderGid;   // 4 bytes
  float latitude;     // 4 bytes
  float longitude;    // 4 bytes
  UINT16 altitude;    // 2 bytes
  UINT16 missionId;   // 2 bytes
  UINT8 source;       // 1 byte
  UINT8 geoType;      // 1 byte
  UINT8 action;       // 1 byte
  UINT8 nodeId;       // 1 byte
```

**Size:** 44 bytes (fixed)

## Notes

1. **Endianness:** All multi-byte integers are big-endian
2. **Floats:** 4-byte IEEE 754 floats where specified as "double" in comments
3. **Reserved Fields:** Always initialized to 0
4. **Strings:** Null-padded ASCII, truncated to fixed length
5. **Vectors:** Dynamic length, serialized as consecutive items
6. **Header:** Standard 16-byte header used by all opcodes
