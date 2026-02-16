import { useState, useEffect, useCallback, useRef } from 'react';
import type { UDPDataPoint } from '../types/udp';

interface UseGetNetworkMembersReturn {
  nodes: Map<number, UDPDataPoint>;
  isLoading: boolean;
  error: Error | null;
}

type Subscriber = (data: UDPDataPoint[]) => void;

let isListenerAttached = false;
const subscribers = new Set<Subscriber>();
const STALE_UDP_MS = 12000;
let hasLoggedParsedData = false; // Flag to ensure we only log once

function ensureGlobalListener() {
  if (isListenerAttached || !window.udp) return;
  isListenerAttached = true;

  window.udp.onDataFromMain((data) => {
    const payload = data as UDPDataPoint[];
    subscribers.forEach((cb) => cb(payload));
  });
}

export function useGetNetworkMembers(): UseGetNetworkMembersReturn {
  const [nodes, setNodes] = useState<Map<number, UDPDataPoint>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdateScheduledRef = useRef(false);
  const lastPacketRef = useRef<number | null>(null);
  const MERGE_WINDOW_MS = 500;
  const STALE_OPCODE102_MS = 3000; // If opcode 102 hasn't been seen for 10 seconds, clear its metadata
  const lastByIdRef = useRef<Map<number, { node: UDPDataPoint; ts: number; opcode102Ts?: number }>>(new Map());

  // Merge function: combines 101 (position) + 102 (details) data
  const mergePoints = useCallback((
    prev: UDPDataPoint | undefined, 
    next: UDPDataPoint,
    isOpcode102Stale: boolean = false
  ): UDPDataPoint => {
    if (!prev) return next;

    // Next is 101 (position) - merge position with prev's 102 metadata
    // But only if opcode 102 data is recent, otherwise clear it (including mother node status)
    if (next.opcode === 101) {
      if (isOpcode102Stale) {
        // Opcode 102 data is stale - return only opcode 101 data (no mother node status)
        return {
          ...next,
          // Clear opcode 102 metadata
          callsign: undefined,
          callsignId: undefined,
          internalData: undefined,
          radioData: undefined,
          regionalData: undefined,
          battleGroupData: undefined,
        };
      }
      
      // Opcode 102 data is recent - preserve it
      return {
        ...prev,
        ...next,
        // Preserve 102 metadata from prev
        callsign: prev.callsign ?? next.callsign,
        callsignId: prev.callsignId ?? next.callsignId,
        internalData: prev.internalData ?? next.internalData,
        radioData: prev.radioData ?? next.radioData,
        regionalData: prev.regionalData ?? next.regionalData,
        battleGroupData: prev.battleGroupData ?? next.battleGroupData,
      };
    }

    // Next is 102 (details) - merge details with prev's 101 position
    if (next.opcode === 102) {
      return {
        ...prev,
        ...next,
        // Preserve position from prev (101)
        latitude: prev.latitude,
        longitude: prev.longitude,
        altitude: prev.altitude,
        veIn: prev.veIn,
        veIe: prev.veIe,
        veIu: prev.veIu,
        trueHeading: prev.trueHeading,
        heading: prev.heading,
      };
    }

    return { ...prev, ...next };
  }, []);

  // Throttled update function
  const scheduleUpdate = useCallback((newNodes: Map<number, UDPDataPoint>) => {
    if (isUpdateScheduledRef.current) {
      return;
    }

    isUpdateScheduledRef.current = true;

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      setNodes(new Map(newNodes));
      isUpdateScheduledRef.current = false;
    }, 16); // ~60 FPS
  }, []);

  useEffect(() => {
    if (!window.udp) {
      setError(new Error('UDP API not available'));
      setIsLoading(false);
      return;
    }

    // Request latest nodes on mount
    if (window.udpRequest) {
      window.udpRequest
        .requestLatest()
        .then((latest) => {
          lastPacketRef.current = Date.now();
          const now = Date.now();
          const nodesMap = new Map<number, UDPDataPoint>();
          (latest as UDPDataPoint[]).forEach((node) => {
            if (node.globalId !== undefined) {
              nodesMap.set(node.globalId, node);
              lastByIdRef.current.set(node.globalId, { node, ts: now });
            }
          });
          setNodes(nodesMap);
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err);
          setIsLoading(false);
        });
    }

    ensureGlobalListener();

    const handleData: Subscriber = (data) => {
      lastPacketRef.current = Date.now();
      const now = Date.now();
      const payload = data as UDPDataPoint[];
      const lastById = lastByIdRef.current;

      // Log parsed data once (only for opcode 102 members)
      if (!hasLoggedParsedData && payload.length > 0) {
        const opcode102Members = payload.filter((p) => p.opcode === 102);
        if (opcode102Members.length > 0) {
          console.log('✅ Parsed Network Members (Opcode 102):', opcode102Members);
          hasLoggedParsedData = true;
        }
      }

      // Merge incoming packet with existing nodes
      payload.forEach((point) => {
        if (point.globalId == null) return;
        const entry = lastById.get(point.globalId);
        const prev = entry?.node;
        
        // Check if opcode 102 data is stale when merging opcode 101
        const isOpcode102Stale = point.opcode === 101 && entry?.opcode102Ts 
          ? (now - entry.opcode102Ts > STALE_OPCODE102_MS)
          : false;
        
        const merged = mergePoints(prev, point, isOpcode102Stale);
        
        // Track opcode 102 timestamp
        const opcode102Ts = point.opcode === 102 ? now : entry?.opcode102Ts;
        
        lastById.set(point.globalId, { 
          node: merged, 
          ts: now,
          opcode102Ts: opcode102Ts
        });
      });

      // Build filtered map - only include nodes seen in recent packets
      // Also remove nodes that haven't been seen for too long (stale nodes)
      const filtered = new Map<number, UDPDataPoint>();
      const NODE_STALE_MS = 3000; // Remove nodes not seen in last 5 seconds
      
      lastById.forEach((entry, id) => {
        const nodeAge = now - entry.ts;
        // Only include nodes seen recently (within merge window) OR very recently updated
        // Also remove nodes that are too old (stale)
        if (nodeAge <= MERGE_WINDOW_MS) {
          filtered.set(id, entry.node);
        } else if (nodeAge > NODE_STALE_MS) {
          // Node is stale - remove it
          lastById.delete(id);
        }
        // If node is between MERGE_WINDOW_MS and NODE_STALE_MS, don't include in filtered
        // but keep in lastById in case it comes back soon
      });

      scheduleUpdate(filtered);
    };

    subscribers.add(handleData);

    const staleInterval = setInterval(() => {
      const now = Date.now();
      
      // Check if UDP has completely stopped (no packets for STALE_UDP_MS)
      if (lastPacketRef.current != null && now - lastPacketRef.current > STALE_UDP_MS) {
        lastPacketRef.current = null;
        lastByIdRef.current.clear();
        setNodes(new Map());
        return;
      }
      
      // Also remove individual stale nodes (not seen in recent packets)
      const NODE_STALE_MS = 3000; // Remove nodes not seen in last 5 seconds
      let hasStaleNodes = false;
      
      lastByIdRef.current.forEach((entry, id) => {
        if (now - entry.ts > NODE_STALE_MS) {
          lastByIdRef.current.delete(id);
          hasStaleNodes = true;
        }
      });
      
      // If we removed stale nodes, update the state
      if (hasStaleNodes) {
        const filtered = new Map<number, UDPDataPoint>();
        lastByIdRef.current.forEach((entry, id) => {
          filtered.set(id, entry.node);
        });
        scheduleUpdate(filtered);
      }
    }, 250);

    return () => {
      subscribers.delete(handleData);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      clearInterval(staleInterval);
    };
  }, [scheduleUpdate, mergePoints]);

  return { nodes, isLoading, error };
}

