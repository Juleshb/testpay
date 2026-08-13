import { useEffect, useRef, useCallback, useState } from 'react';
import { getToken } from '../auth';
import { CommunityRealtimeClient } from '../lib/communityRealtime';

export function useCommunityRealtime({ onEvent } = {}) {
  const clientRef = useRef(null);
  const onEventRef = useRef(onEvent);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const token = getToken();
    if (!token) return undefined;

    const client = new CommunityRealtimeClient(token, {
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
      onMessage: (msg) => onEventRef.current?.(msg),
    });

    clientRef.current = client;
    client.connect();

    return () => {
      client.close();
      clientRef.current = null;
      setConnected(false);
    };
  }, []);

  const subscribeChannel = useCallback((slug) => {
    clientRef.current?.subscribeChannel(slug);
  }, []);

  const unsubscribeChannel = useCallback((slug) => {
    clientRef.current?.unsubscribeChannel(slug);
  }, []);

  const subscribeConversation = useCallback((conversationId) => {
    clientRef.current?.subscribeConversation(conversationId);
  }, []);

  const unsubscribeConversation = useCallback((conversationId) => {
    clientRef.current?.unsubscribeConversation(conversationId);
  }, []);

  const sendChannelTyping = useCallback((channel, isTyping) => {
    clientRef.current?.sendTyping({ channel, isTyping });
  }, []);

  const sendDmTyping = useCallback((conversationId, isTyping) => {
    clientRef.current?.sendTyping({ conversationId, isTyping });
  }, []);

  return {
    connected,
    subscribeChannel,
    unsubscribeChannel,
    subscribeConversation,
    unsubscribeConversation,
    sendChannelTyping,
    sendDmTyping,
  };
}

export function useTypingEmitter(sendTyping, targetKey, targetValue) {
  const timerRef = useRef(null);
  const activeRef = useRef(false);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (activeRef.current && sendTyping && targetValue) {
      activeRef.current = false;
      sendTyping(targetValue, false);
    }
  }, [sendTyping, targetValue]);

  const ping = useCallback(() => {
    if (!sendTyping || !targetValue) return;
    if (!activeRef.current) {
      activeRef.current = true;
      sendTyping(targetValue, true);
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      activeRef.current = false;
      sendTyping(targetValue, false);
    }, 2000);
  }, [sendTyping, targetValue]);

  useEffect(() => () => stop(), [stop, targetKey]);

  return { ping, stop };
}

export function formatTypingLabel(typers) {
  const names = [...new Set(typers.map((t) => t.name).filter(Boolean))];
  if (names.length === 0) return null;
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return `${names[0]} and ${names.length - 1} others are typing…`;
}
