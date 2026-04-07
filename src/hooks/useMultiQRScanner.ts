import { useEffect, useRef, useState, useCallback } from 'react';
import {
    getDefaultScanner,
    scanImageData,
    setModuleArgs,
    ZBarConfigType,
    ZBarSymbolType,
} from '@undecaf/zbar-wasm';
import zbarWasmUrl from '@undecaf/zbar-wasm/dist/zbar.wasm?url';

setModuleArgs({
    locateFile: (filename, directory) =>
        filename === 'zbar.wasm' ? zbarWasmUrl : `${directory}${filename}`,
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
    onCodesDetected?: (codes: DetectedBarcode[]) => void;
}

type BarcodeDetectorLike = {
    detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};

const getNativeBarcodeDetector = () =>
    typeof window !== 'undefined' ? (window as any).BarcodeDetector : undefined;

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
    const scanner = await getDefaultScanner();
    scanner.setConfig(ZBarSymbolType.ZBAR_NONE, ZBarConfigType.ZBAR_CFG_ENABLE, 0);
    scanner.setConfig(ZBarSymbolType.ZBAR_QRCODE, ZBarConfigType.ZBAR_CFG_ENABLE, 1);

    const frameCanvas = document.createElement('canvas');
    const frameContext = frameCanvas.getContext('2d', { willReadFrequently: true });

    if (!frameContext) {
        throw new Error('Could not create a canvas context for QR detection.');
    }

    return {
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
        return new NativeBarcodeDetector({ formats: ['qr_code'] });
    }

    return createLocalDetector();
};

export const useMultiQRScanner = ({
    isEnabled = true,
    scanInterval = 600,
    fps,
    facingMode = 'environment',
    onCodesDetected
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

    useEffect(() => {
        let isCancelled = false;

        const initializeDetector = async () => {
            try {
                const detector = await createDetector();
                if (isCancelled) return;

                detectorRef.current = detector;
                setIsSupported(true);
                setError('');
            } catch (err) {
                if (isCancelled) return;

                detectorRef.current = null;
                setIsSupported(false);
                setError('Barcode detection is not supported and local QR engine failed to load.');
                console.error('MultiQR: Failed to initialize barcode detector', err);
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

        const startCamera = async () => {
            try {
                // Stop any existing stream before starting a new one
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                    setIsTorchAvailable(false);
                    setIsTorchOn(false);
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: facingMode,
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });

                if (isCancelled) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                streamRef.current = stream;
                setActiveStream(stream);

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // Ensure the video element actually starts playing
                    videoRef.current.play().catch(e => console.warn("Video play auto-start prevented:", e));

                    // Check for Torch capability
                    try {
                        const track = stream.getVideoTracks()[0];
                        const capabilities = track.getCapabilities() as any;
                        setIsTorchAvailable(!!capabilities.torch);
                    } catch (e) {
                        setIsTorchAvailable(false);
                    }
                }
            } catch (err) {
                if (!isCancelled) {
                    console.error('Error accessing webcam:', err);
                    setError('Could not access webcam. Please verify permissions.');
                }
            }
        };

        startCamera();

        return () => {
            isCancelled = true;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            setActiveStream(null);
            setIsTorchAvailable(false);
            setIsTorchOn(false);
        };
    }, [facingMode]);

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
                    lastDetectTime = now;
                    isDetecting = true;
                    try {
                        const barcodes = await detector.detect(video);
                        if (onCodesDetectedRef.current) {
                            onCodesDetectedRef.current(barcodes);
                        }
                    } catch (err) {
                        // Log only once to avoid spamming
                        if (lastDetectTime === now) {
                            console.error('MultiQR: Detection failed. Check if WASM/Native engine is ready.', err);
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
                advanced: [{ torch: nextState }] as any
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
