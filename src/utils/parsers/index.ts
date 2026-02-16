import { parseOpcode101 } from './parseOpcode101';
import { parseOpcode102 } from './parseOpcode102';
import { parseOpcode103 } from './parseOpcode103';
import { parseOpcode104 } from './parseOpcode104';
import { parseOpcode106 } from './parseOpcode106';

export function parseUdpMessage(msg: Buffer, bin: string): { opcode: number; data: any[] } | null {
  // Extract opcode from header
  const opcode = msg[1]; // Opcode is at byte 1

  switch (opcode) {
    case 101: {
      const data = parseOpcode101(msg, bin);
      return { opcode: 101, data };
    }
    case 102: {
      const data = parseOpcode102(msg);
      return { opcode: 102, data };
    }
    case 103: {
      const data = parseOpcode103(msg);
      return { opcode: 103, data };
    }
    case 104: {
      const data = parseOpcode104(msg);
      return { opcode: 104, data };
    }
    case 106: {
      const data = parseOpcode106(msg);
      return { opcode: 106, data };
    }
    default:
      return null;
  }
}

export { parseOpcode101, parseOpcode102, parseOpcode103, parseOpcode104, parseOpcode106 };

