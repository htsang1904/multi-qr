import { useEffect, useRef, useState, useCallback } from 'react';
import {
    getDefaultScanner,
    scanImageData,
    setModuleArgs,
    ZBarConfigType,
    ZBarSymbolType,
} from '@undecaf/zbar-wasm';
// `no-inline` is important for library builds. A large data: URL works on some
// desktop browsers but fails to load on Safari/iOS.
import zbarWasmUrl from '@undecaf/zbar-wasm/dist/zbar.wasm?url&no-inline';

const LOG_PREFIX = '[MultiQR]';

const errorDetails = (error: unknown) => error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : { error };

setModuleArgs({
    locateFile: (filename, directory) => {
        const resolvedUrl = filename === 'zbar.wasm' ? zbarWasmUrl : `${directory}${filename}`;
        if (filename === 'zbar.wasm') {
            console.info(`${LOG_PREFIX} Resolving WASM asset`, {
                url: resolvedUrl,
                protocol: (() => {
                    try { return new URL(resolvedUrl, document.baseURI).protocol; }
                    catch { return 'invalid-url'; }
                })(),
            });
        }
        return resolvedUrl;
    },
});

interface Point2D {
    x: number;
    y: number;
}

export interface DetectedBarcode {
    boundingBox: DOMRectReadOnly;
    cornerPoints: Point2D[];
    format: string;
    rawValue: string;
}

export interface UseMultiQRScannerOptions {
    isEnabled?: boolean;
    scanInterval?: number;
    fps?: number; // New: Frames per second control
    facingMode?: 'user' | 'environment';
    /** ID of the camera to use. Takes precedence over facingMode. */
    deviceId?: string;
    onCodesDetected?: (codes: DetectedBarcode[]) => void;
    /** Called after the selected camera stream has started successfully. */
    onCameraReady?: (stream: MediaStream) => void;
    /** Called when the camera cannot be opened or used. */
    onCameraError?: (error: Error | DOMException) => void;
}

type BarcodeDetectorLike = {
    detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
    engine: 'native' | 'zbar-wasm';
};

type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

const getNativeBarcodeDetector = () =>
    typeof window !== 'undefined'
        ? (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector
        : undefined;

const createBoundingBox = (points: Point2D[]) => {
    if (points.length === 0) {
        return DOMRectReadOnly.fromRect({ x: 0, y: 0, width: 0, height: 0 });
    }

    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return DOMRectReadOnly.fromRect({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
    });
};

const createLocalDetector = async (): Promise<BarcodeDetectorLike> => {
    console.info(`${LOG_PREFIX} Native BarcodeDetector unavailable; loading ZBar WASM`, {
        wasmUrl: zbarWasmUrl,
    });
    const scanner = await getDefaultScanner();
    scanner.setConfig(ZBarSymbolType.ZBAR_NONE, ZBarConfigType.ZBAR_CFG_ENABLE, 0);
    scanner.setConfig(ZBarSymbolType.ZBAR_QRCODE, ZBarConfigType.ZBAR_CFG_ENABLE, 1);

    const frameCanvas = document.createElement('canvas');
    const frameContext = frameCanvas.getContext('2d', { willReadFrequently: true });

    if (!frameContext) {
        throw new Error('Could not create a canvas context for QR detection.');
    }

    return {
        engine: 'zbar-wasm',
        detect: async (video: HTMLVideoElement) => {
            if (video.videoWidth === 0 || video.videoHeight === 0) {
                return [];
            }

            if (frameCanvas.width !== video.videoWidth || frameCanvas.height !== video.videoHeight) {
                frameCanvas.width = video.videoWidth;
                frameCanvas.height = video.videoHeight;
            }

            frameContext.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height);
            const imageData = frameContext.getImageData(0, 0, frameCanvas.width, frameCanvas.height);
            const symbols = await scanImageData(imageData, scanner);

            return symbols.map(symbol => {
                const cornerPoints = symbol.points.map(point => ({
                    x: point.x,
                    y: point.y,
                }));

                return {
                    boundingBox: createBoundingBox(cornerPoints),
                    cornerPoints,
                    format: 'qr_code',
                    rawValue: symbol.decode('utf-8'),
                };
            });
        },
    };
};

const createDetector = async (): Promise<BarcodeDetectorLike> => {
    const NativeBarcodeDetector = getNativeBarcodeDetector();

    if (NativeBarcodeDetector) {
        console.info(`${LOG_PREFIX} Using native BarcodeDetector`);
        const detector = new NativeBarcodeDetector({ formats: ['qr_code'] });
        return { engine: 'native', detect: source => detector.detect(source) };
    }

    return createLocalDetector();
};

export const useMultiQRScanner = ({
    isEnabled = true,
    scanInterval = 600,
    fps,
    facingMode = 'environment',
    deviceId,
    onCodesDetected,
    onCameraReady,
    onCameraError
}: UseMultiQRScannerOptions = {}) => {
    // Calculate final interval from FPS if provided, ensuring a safe minimum of 40ms (~25 FPS)
    const effectiveInterval = fps ? Math.max(40, 1000 / fps) : scanInterval;
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isSupported, setIsSupported] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [isTorchAvailable, setIsTorchAvailable] = useState(false);
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const detectorRef = useRef<BarcodeDetectorLike | null>(null);
    const onCameraReadyRef = useRef(onCameraReady);
    const onCameraErrorRef = useRef(onCameraError);

    useEffect(() => {
        onCameraReadyRef.current = onCameraReady;
    }, [onCameraReady]);

    useEffect(() => {
        onCameraErrorRef.current = onCameraError;
    }, [onCameraError]);

    useEffect(() => {
        let isCancelled = false;

        const initializeDetector = async () => {
            console.info(`${LOG_PREFIX} Initializing detector`, {
                secureContext: window.isSecureContext,
                nativeBarcodeDetector: Boolean(getNativeBarcodeDetector()),
                userAgent: navigator.userAgent,
            });
            try {
                const detector = await createDetector();
                if (isCancelled) return;

                detectorRef.current = detector;
                setIsSupported(true);
                console.info(`${LOG_PREFIX} Detector ready`, { engine: detector.engine });
            } catch (err) {
                if (isCancelled) return;

                detectorRef.current = null;
                setIsSupported(false);
                setError('Barcode detection is not supported and local QR engine failed to load.');
                console.error(`${LOG_PREFIX} Failed to initialize barcode detector`, {
                    ...errorDetails(err),
                    wasmUrl: zbarWasmUrl,
                    online: navigator.onLine,
                    secureContext: window.isSecureContext,
                });
            }
        };

        initializeDetector();

        return () => {
            isCancelled = true;
            detectorRef.current = null;
        };
    }, []);

    // Initialize Camera
    useEffect(() => {
        let isCancelled = false;
        let removeTrackEndedListener = () => {};

        const stopStream = (stream: MediaStream | null) => {
            stream?.getTracks().forEach(track => track.stop());
        };

        const clearCurrentStream = () => {
            removeTrackEndedListener();
            removeTrackEndedListener = () => {};
            const currentStream = streamRef.current;
            stopStream(currentStream);
            streamRef.current = null;

            if (videoRef.current?.srcObject === currentStream) {
                videoRef.current.srcObject = null;
            }

            setActiveStream(null);
            setIsTorchAvailable(false);
            setIsTorchOn(false);
        };

        clearCurrentStream();

        if (!isEnabled) {
            return () => {
                isCancelled = true;
                clearCurrentStream();
            };
        }

        const startCamera = async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error('Camera access is not supported in this browser.');
                }

                const videoConstraints: MediaTrackConstraints = deviceId
                    ? {
                        deviceId: { exact: deviceId },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                    : {
                        facingMode,
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    };

                console.info(`${LOG_PREFIX} Requesting camera`, {
                    selection: deviceId ? 'deviceId' : 'facingMode',
                    deviceId: deviceId ? `…${deviceId.slice(-6)}` : undefined,
                    facingMode: deviceId ? undefined : facingMode,
                    constraints: videoConstraints,
                });

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: videoConstraints
                });

                if (isCancelled) {
                    stopStream(stream);
                    return;
                }

                const video = videoRef.current;
                if (!video) {
                    stopStream(stream);
                    throw new Error('Camera video element is not available.');
                }

                streamRef.current = stream;
                video.srcObject = stream;

                const videoTrack = stream.getVideoTracks()[0];
                if (videoTrack) {
                    const handleTrackEnded = () => {
                        if (isCancelled || streamRef.current !== stream) return;

                        const cameraError = new DOMException(
                            'The selected camera is no longer available.',
                            'NotReadableError'
                        );
                        clearCurrentStream();
                        setError(cameraError.message);
                        try {
                            onCameraErrorRef.current?.(cameraError);
                        } catch (callbackError) {
                            console.error('MultiQR: onCameraError callback failed', callbackError);
                        }
                    };

                    videoTrack.addEventListener('ended', handleTrackEnded);
                    removeTrackEndedListener = () => {
                        videoTrack.removeEventListener('ended', handleTrackEnded);
                    };
                }

                await video.play();

                if (isCancelled || streamRef.current !== stream) {
                    stopStream(stream);
                    if (video.srcObject === stream) video.srcObject = null;
                    return;
                }

                setActiveStream(stream);
                setError('');

                console.info(`${LOG_PREFIX} Camera ready`, {
                    video: {
                        width: video.videoWidth,
                        height: video.videoHeight,
                        readyState: video.readyState,
                    },
                    track: videoTrack?.getSettings(),
                });

                try {
                    const track = stream.getVideoTracks()[0];
                    const capabilities = track?.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
                    setIsTorchAvailable(!!capabilities?.torch);
                } catch {
                    setIsTorchAvailable(false);
                }

                try {
                    onCameraReadyRef.current?.(stream);
                } catch (callbackError) {
                    console.error('MultiQR: onCameraReady callback failed', callbackError);
                }
            } catch (err) {
                if (!isCancelled) {
                    const cameraError = err instanceof Error
                        ? err
                        : new Error('An unknown camera error occurred.');

                    clearCurrentStream();
                    console.error(`${LOG_PREFIX} Camera initialization failed`, {
                        ...errorDetails(cameraError),
                        selection: deviceId ? 'deviceId' : 'facingMode',
                        secureContext: window.isSecureContext,
                    });
                    setError(cameraError.message || 'Could not access webcam. Please verify permissions.');
                    try {
                        onCameraErrorRef.current?.(cameraError);
                    } catch (callbackError) {
                        console.error('MultiQR: onCameraError callback failed', callbackError);
                    }
                }
            }
        };

        void startCamera();

        return () => {
            isCancelled = true;
            clearCurrentStream();
        };
    }, [isEnabled, deviceId, facingMode]);

    const onCodesDetectedRef = useRef(onCodesDetected);
    useEffect(() => {
        onCodesDetectedRef.current = onCodesDetected;
    }, [onCodesDetected]);

    // Barcode Detection Loop
    useEffect(() => {
        if (!isSupported) return;

        let animationFrameId: number;
        let lastDetectTime = 0;
        let isDetecting = false;
        let hasLoggedDetectionStart = false;
        let hasLoggedDetectionError = false;

        const detectCodes = async () => {
            const video = videoRef.current;
            const detector = detectorRef.current;
            if (!video || !detector || !isEnabled) {
                animationFrameId = requestAnimationFrame(detectCodes);
                return;
            }

            const now = performance.now();
            // Using readyState >= 2 (HAVE_CURRENT_DATA) to start scanning as soon as possible
            if (!isDetecting && now - lastDetectTime >= effectiveInterval) {
                if (video.readyState >= 2 && video.videoWidth > 0) {
                    if (!hasLoggedDetectionStart) {
                        hasLoggedDetectionStart = true;
                        console.info(`${LOG_PREFIX} Detection loop active`, {
                            engine: detector.engine,
                            width: video.videoWidth,
                            height: video.videoHeight,
                            intervalMs: effectiveInterval,
                        });
                    }
                    lastDetectTime = now;
                    isDetecting = true;
                    try {
                        const barcodes = await detector.detect(video);
                        if (onCodesDetectedRef.current) {
                            onCodesDetectedRef.current(barcodes);
                        }
                    } catch (err) {
                        if (!hasLoggedDetectionError) {
                            hasLoggedDetectionError = true;
                            console.error(`${LOG_PREFIX} Detection failed (further errors suppressed)`, {
                                ...errorDetails(err),
                                engine: detector.engine,
                                video: {
                                    width: video.videoWidth,
                                    height: video.videoHeight,
                                    readyState: video.readyState,
                                },
                            });
                        }
                    } finally {
                        isDetecting = false;
                    }
                }
            }
            animationFrameId = requestAnimationFrame(detectCodes);
        };

        animationFrameId = requestAnimationFrame(detectCodes);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [isSupported, effectiveInterval, isEnabled]);
    // onCodesDetected removed from deps

    const toggleTorch = useCallback(async () => {
        const stream = streamRef.current;
        if (!stream || !isTorchAvailable) return;

        try {
            const track = stream.getVideoTracks()[0];
            const nextState = !isTorchOn;
            await track.applyConstraints({
                advanced: [{ torch: nextState } as MediaTrackConstraintSet & { torch: boolean }]
            });
            setIsTorchOn(nextState);
        } catch (err) {
            console.error('Error toggling torch:', err);
        }
    }, [isTorchAvailable, isTorchOn]);

    return {
        videoRef,
        isSupported,
        error,
        isTorchAvailable,
        isTorchOn,
        toggleTorch,
        activeStream
    };
};
