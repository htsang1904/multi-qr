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
    facingMode?: 'user' | 'environment';
    onCodesDetected?: (codes: DetectedBarcode[]) => void;
}

export const useMultiQRScanner = ({
    isEnabled = true,
    scanInterval = 600,
    facingMode = 'environment',
    onCodesDetected
}: UseMultiQRScannerOptions = {}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isSupported, setIsSupported] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [isTorchAvailable, setIsTorchAvailable] = useState(false);
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [activeStream, setActiveStream] = useState<MediaStream | null>(null);

    // Initialize Camera
    useEffect(() => {
        if (!BarcodeDetectorClass) {
            setIsSupported(false);
            setError('Barcode Detection is not supported and polyfill failed to load.');
            return;
        }

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: facingMode,
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setActiveStream(stream);

                    // Check for Torch capability
                    const track = stream.getVideoTracks()[0];
                    const capabilities = track.getCapabilities() as any;
                    setIsTorchAvailable(!!capabilities.torch);
                }
            } catch (err) {
                console.error('Error accessing webcam:', err);
                setError('Could not access webcam. Please verify permissions.');
            }
        };

        startCamera();

        return () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [facingMode]);

    // Barcode Detection Loop
    useEffect(() => {
        if (!isSupported || !videoRef.current) return;

        const barcodeDetector = new BarcodeDetectorClass({ formats: ['qr_code'] });
        let animationFrameId: number;
        let lastDetectTime = 0;

        const detectCodes = async (timestamp: number) => {
            if (!isEnabled) {
                animationFrameId = requestAnimationFrame(detectCodes);
                return;
            }

            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                if (timestamp - lastDetectTime >= scanInterval) {
                    lastDetectTime = timestamp;
                    try {
                        const barcodes = await barcodeDetector.detect(videoRef.current);
                        if (onCodesDetected) {
                            onCodesDetected(barcodes);
                        }
                    } catch (err) {
                        console.error('Barcode detection error:', err);
                    }
                }
            }
            animationFrameId = requestAnimationFrame(detectCodes);
        };

        animationFrameId = requestAnimationFrame(detectCodes);

        return () => cancelAnimationFrame(animationFrameId);
    }, [isSupported, scanInterval, isEnabled, onCodesDetected]);

    const toggleTorch = useCallback(async () => {
        if (!activeStream || !isTorchAvailable) return;

        try {
            const track = activeStream.getVideoTracks()[0];
            const nextState = !isTorchOn;
            await track.applyConstraints({
                advanced: [{ torch: nextState }] as any
            });
            setIsTorchOn(nextState);
        } catch (err) {
            console.error('Error toggling torch:', err);
        }
    }, [activeStream, isTorchAvailable, isTorchOn]);

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
