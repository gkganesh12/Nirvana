'use client';

import { useEffect, useRef, useState } from 'react';
import * as rrweb from 'rrweb';
// @ts-ignore - eventWithTime is not exported from rrweb directly in some versions
import type { eventWithTime, listenerHandler } from '@rrweb/types';

interface UseSessionRecordingOptions {
    enabled?: boolean;
    sampleRate?: number;
    maxDuration?: number; // in seconds
    onError?: (error: Error) => void;
}

export function useSessionRecording(options: UseSessionRecordingOptions = {}) {
    const {
        enabled = true,
        sampleRate = 1,
        maxDuration = 300, // 5 minutes default
        onError,
    } = options;

    const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    const [isRecording, setIsRecording] = useState(false);
    const eventsRef = useRef<eventWithTime[]>([]);
    const stopFnRef = useRef<listenerHandler | undefined | null>(null);
    const startTimeRef = useRef<number>(0);

    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return;

        startTimeRef.current = Date.now();
        setIsRecording(true);

        const stopFn = rrweb.record({
            emit(event) {
                eventsRef.current.push(event);

                // Check if max duration exceeded
                const elapsed = (Date.now() - startTimeRef.current) / 1000;
                if (elapsed > maxDuration) {
                    stopRecording();
                }
            },
            sampling: {
                scroll: sampleRate < 1 ? Math.floor(150 / sampleRate) : 0,
                input: 'last',
            },
            recordCanvas: false, // Disable canvas recording for performance
            collectFonts: false,
        });

        stopFnRef.current = stopFn;

        return () => {
            if (stopFn) {
                stopFn();
            }
            setIsRecording(false);
        };
    }, [enabled, sampleRate, maxDuration]);

    const stopRecording = () => {
        if (stopFnRef.current) {
            stopFnRef.current();
            stopFnRef.current = null;
            setIsRecording(false);
        }
    };

    const getEvents = (): eventWithTime[] => {
        return eventsRef.current;
    };

    const getDuration = (): number => {
        return (Date.now() - startTimeRef.current) / 1000;
    };

    const uploadReplay = async (alertEventId: string): Promise<boolean> => {
        try {
            const events = getEvents();
            if (events.length === 0) {
                console.warn('No events to upload');
                return false;
            }

            const duration = getDuration();

            // Get presigned upload URL from backend
            const uploadUrlRes = await fetch(`/api/session-replay/upload-url/${sessionId}`);
            if (!uploadUrlRes.ok) {
                throw new Error('Failed to get upload URL');
            }

            const { uploadUrl, storageUrl } = await uploadUrlRes.json();

            // Upload events to R2
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(events),
            });

            if (!uploadRes.ok) {
                throw new Error('Failed to upload replay');
            }

            // Save metadata to backend
            const metadataRes = await fetch('/api/session-replay/ingest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alertEventId,
                    sessionId,
                    duration,
                    storageUrl,
                }),
            });

            return metadataRes.ok;
        } catch (error) {
            console.error('Failed to upload session replay:', error);
            onError?.(error as Error);
            return false;
        }
    };

    return {
        sessionId,
        isRecording,
        stopRecording,
        getEvents,
        getDuration,
        uploadReplay,
    };
}
