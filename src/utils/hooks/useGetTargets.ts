import { useState, useEffect, useCallback, useRef } from 'react';

export interface TargetData {
  globalId: number;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  groundSpeed: number;
  range: number;
  opcode: 104;
}

interface UseGetTargetsReturn {
  targets: TargetData[];
  isLoading: boolean;
  error: Error | null;
}

type Subscriber = (data: TargetData[]) => void;

let isListenerAttached = false;
const subscribers = new Set<Subscriber>();
const STALE_TARGETS_MS = 12000;
let hasLoggedTargets = false; // Flag to ensure we only log once

function ensureGlobalListener() {
  if (isListenerAttached || !window.udp) return;
  isListenerAttached = true;

  window.udp.onTargetsFromMain((data) => {
    const payload = data as TargetData[];
    subscribers.forEach((cb) => cb(payload));
  });
}

export function useGetTargets(): UseGetTargetsReturn {
  const [targets, setTargets] = useState<TargetData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdateScheduledRef = useRef(false);
  const lastPacketRef = useRef<number | null>(null);

  // Throttled update function
  const scheduleUpdate = useCallback((newTargets: TargetData[]) => {
    if (isUpdateScheduledRef.current) {
      return;
    }

    isUpdateScheduledRef.current = true;

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      setTargets(newTargets);
      isUpdateScheduledRef.current = false;
    }, 16); // ~60 FPS
  }, []);

  useEffect(() => {
    if (!window.udp) {
      setError(new Error('UDP API not available'));
      setIsLoading(false);
      return;
    }

    // Request latest targets on mount
    if (window.udpRequest) {
      window.udpRequest
        .requestTargets()
        .then((latest) => {
          lastPacketRef.current = Date.now();
          setTargets((latest as TargetData[]) || []);
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
      const payload = data as TargetData[];
      
      // Log parsed targets once (only for opcode 104)
      if (!hasLoggedTargets && payload.length > 0) {
        console.log('✅ Parsed Targets (Opcode 104):', payload);
        hasLoggedTargets = true;
      }
      
      scheduleUpdate(payload);
    };

    subscribers.add(handleData);

    const staleInterval = setInterval(() => {
      if (lastPacketRef.current == null) return;
      if (Date.now() - lastPacketRef.current > STALE_TARGETS_MS) {
        lastPacketRef.current = null;
        setTargets([]);
      }
    }, 250);

    return () => {
      subscribers.delete(handleData);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      clearInterval(staleInterval);
    };
  }, [scheduleUpdate]);

  return { targets, isLoading, error };
}

