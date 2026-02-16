import { useState, useEffect, useCallback, useRef } from 'react';
import { EngagementData } from '../types/udp';

interface UseGetEngagementsReturn {
  engagements: EngagementData[];
  isLoading: boolean;
  error: Error | null;
}

type Subscriber = (data: EngagementData[]) => void;

let isListenerAttached = false;
const subscribers = new Set<Subscriber>();
const STALE_ENGAGEMENTS_MS = 12000;
let hasLoggedEngagements = false; // Flag to ensure we only log once

function ensureGlobalListener() {
  if (isListenerAttached || !window.udp) return;
  isListenerAttached = true;

  window.udp.onEngagementsFromMain((data) => {
    const payload = data as EngagementData[];
    subscribers.forEach((cb) => cb(payload));
  });
}

export function useGetEngagements(): UseGetEngagementsReturn {
  const [engagements, setEngagements] = useState<EngagementData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdateScheduledRef = useRef(false);
  const lastPacketRef = useRef<number | null>(null);

  // Throttled update function
  const scheduleUpdate = useCallback((newEngagements: EngagementData[]) => {
    if (isUpdateScheduledRef.current) {
      return;
    }

    isUpdateScheduledRef.current = true;

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      setEngagements(newEngagements);
      isUpdateScheduledRef.current = false;
    }, 16); // ~60 FPS
  }, []);

  useEffect(() => {
    if (!window.udp) {
      setError(new Error('UDP API not available'));
      setIsLoading(false);
      return;
    }

    // Request latest engagements on mount
    if (window.udpRequest) {
      window.udpRequest
        .requestEngagements()
        .then((latest) => {
          lastPacketRef.current = Date.now();
          setEngagements((latest as EngagementData[]) || []);
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
      const payload = data as EngagementData[];
      
      // Log parsed engagements once (only for opcode 103)
      if (!hasLoggedEngagements && payload.length > 0) {
        console.log('✅ Parsed Engagements (Opcode 103):', payload);
        hasLoggedEngagements = true;
      }
      
      scheduleUpdate(payload);
    };

    subscribers.add(handleData);

    const staleInterval = setInterval(() => {
      if (lastPacketRef.current == null) return;
      if (Date.now() - lastPacketRef.current > STALE_ENGAGEMENTS_MS) {
        lastPacketRef.current = null;
        setEngagements([]);
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

  return { engagements, isLoading, error };
}

