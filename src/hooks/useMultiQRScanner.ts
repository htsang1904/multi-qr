import { useEffect, useRef, useState, useCallback } from 'react';
import { BarcodeDetectorPolyfill } from '@undecaf/barcode-detector-polyfill';

// Force usage of polyfill if native not present
const BarcodeDetectorClass = (window as any).BarcodeDetector || BarcodeDetectorPolyfill;

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

    // Initialize Camera
    useEffect(() => {
        let isCancelled = false;

        if (!BarcodeDetectorClass) {
            setIsSupported(false);
            setError('Barcode Detection is not supported and polyfill failed to load.');
            return;
        }

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
        if (!isSupported || !videoRef.current) return;

        const barcodeDetector = new BarcodeDetectorClass({ formats: ['qr_code'] });
        let animationFrameId: number;
        let lastDetectTime = 0;
        let isDetecting = false;

        const detectCodes = async () => {
            if (!isEnabled) {
                animationFrameId = requestAnimationFrame(detectCodes);
                return;
            }

            const now = performance.now();
            if (!isDetecting && now - lastDetectTime >= effectiveInterval) {
                const video = videoRef.current;
                if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
                    lastDetectTime = now;
                    isDetecting = true;
                    try {
                        const barcodes = await barcodeDetector.detect(video);
                        if (onCodesDetectedRef.current) {
                            onCodesDetectedRef.current(barcodes);
                        }
                    } catch (err) {
                        console.error('Barcode detection error:', err);
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
    }, [isSupported, effectiveInterval, isEnabled]); // onCodesDetected removed from deps

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
