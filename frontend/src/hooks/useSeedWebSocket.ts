/**
 * useSeedWebSocket
 * ================
 * React hook that connects to both Seed WebSocket streams:
 *   - /ws/positions     → positionsData (SeedPositionsUpdateData)
 *   - /ws/system-health → healthData    (SeedHealthUpdateData)
 *
 * Automatically connects on mount and disconnects on unmount.
 * The WebSocket instances are singletons so multiple components
 * sharing this hook don't open duplicate connections.
 */

import { useState, useEffect } from 'react';
import { getSeedPositionsWs, getSeedHealthWs } from '../services/SeedWebSocketService';
import type { SeedPositionsUpdateData, SeedHealthUpdateData } from '../types/apiModels';

export interface UseSeedWebSocketResult {
  connected: boolean;
  positionsData: SeedPositionsUpdateData | null;
  healthData: SeedHealthUpdateData | null;
}

export function useSeedWebSocket(): UseSeedWebSocketResult {
  const [connected, setConnected] = useState(false);
  const [positionsData, setPositionsData] = useState<SeedPositionsUpdateData | null>(null);
  const [healthData, setHealthData] = useState<SeedHealthUpdateData | null>(null);

  useEffect(() => {
    const posWs = getSeedPositionsWs();
    const hlthWs = getSeedHealthWs();

    posWs.connect();
    hlthWs.connect();

    const removePosMsgListener = posWs.onMessage((msg) => {
      if (msg.type === 'positions_update' && msg.data) {
        setPositionsData(msg.data);
      }
    });

    const removeHlthMsgListener = hlthWs.onMessage((msg) => {
      if (msg.type === 'health_update' && msg.data) {
        setHealthData(msg.data);
      }
    });

    const removePosConnect = posWs.onConnect(() => setConnected(true));
    const removePosDisconnect = posWs.onDisconnect(() => setConnected(posWs.isConnected));

    return () => {
      removePosMsgListener();
      removeHlthMsgListener();
      removePosConnect();
      removePosDisconnect();
      // Don't disconnect singletons — other components may still need them
    };
  }, []);

  return { connected, positionsData, healthData };
}
