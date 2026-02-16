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
  const lastByIdRef = useRef<Map<number, { node: UDPDataPoint; ts: number }>>(new Map());

  // Merge function: combines 101 (position) + 102 (details) data
  const mergePoints = useCallback((prev: UDPDataPoint | undefined, next: UDPDataPoint): UDPDataPoint => {
    if (!prev) return next;

    // Next is 101 (position) - merge position with prev's 102 metadata
    if (next.opcode === 101) {
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
        const prev = lastById.get(point.globalId)?.node;
        const merged = mergePoints(prev, point);
        lastById.set(point.globalId, { node: merged, ts: now });
      });

      // Build filtered map
      const filtered = new Map<number, UDPDataPoint>();
      lastById.forEach((entry, id) => {
        if (now - entry.ts <= MERGE_WINDOW_MS) {
          filtered.set(id, entry.node);
        } else {
          lastById.delete(id);
        }
      });

      scheduleUpdate(filtered);
    };

    subscribers.add(handleData);

    const staleInterval = setInterval(() => {
      if (lastPacketRef.current == null) return;
      if (Date.now() - lastPacketRef.current > STALE_UDP_MS) {
        lastPacketRef.current = null;
        lastByIdRef.current.clear();
        setNodes(new Map());
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

