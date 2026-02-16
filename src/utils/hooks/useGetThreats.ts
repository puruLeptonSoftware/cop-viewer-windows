import { useState, useEffect, useCallback, useRef } from 'react';
import type { ThreatData } from '../types/udp';

interface UseGetThreatsReturn {
  threats: ThreatData[];
  isLoading: boolean;
  error: Error | null;
}

type Subscriber = (data: ThreatData[]) => void;

let isListenerAttached = false;
const subscribers = new Set<Subscriber>();
const STALE_THREATS_MS = 12000;
let hasLoggedThreats = false;

function ensureGlobalListener() {
  if (isListenerAttached || !window.udp) return;
  isListenerAttached = true;

  window.udp.onThreatsFromMain((data) => {
    const payload = data as ThreatData[];
    subscribers.forEach((cb) => cb(payload));
  });
}

export function useGetThreats(): UseGetThreatsReturn {
  const [threats, setThreats] = useState<ThreatData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdateScheduledRef = useRef(false);
  const lastPacketRef = useRef<number | null>(null);

  const scheduleUpdate = useCallback((newThreats: ThreatData[]) => {
    if (isUpdateScheduledRef.current) {
      return;
    }

    isUpdateScheduledRef.current = true;

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      setThreats(newThreats);
      isUpdateScheduledRef.current = false;
    }, 16); // ~60 FPS
  }, []);

  useEffect(() => {
    if (!window.udp) {
      setError(new Error('UDP API not available'));
      setIsLoading(false);
      return;
    }

    if (window.udpRequest) {
      window.udpRequest
        .requestThreats()
        .then((latest) => {
          lastPacketRef.current = Date.now();
          setThreats((latest as ThreatData[]) || []);
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
      const payload = data as ThreatData[];
      
      // Log parsed threats once (only for opcode 106)
      if (!hasLoggedThreats && payload.length > 0) {
        console.log('✅ Parsed Threats (Opcode 106):', payload);
        hasLoggedThreats = true;
      }
      
      scheduleUpdate(payload);
    };

    subscribers.add(handleData);

    const staleInterval = setInterval(() => {
      if (lastPacketRef.current == null) return;
      if (Date.now() - lastPacketRef.current > STALE_THREATS_MS) {
        lastPacketRef.current = null;
        setThreats([]);
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

  return { threats, isLoading, error };
}

