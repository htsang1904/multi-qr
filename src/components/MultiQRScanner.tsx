import React, { useEffect, useRef, useState } from 'react';
import { BarcodeDetectorPolyfill } from '@undecaf/barcode-detector-polyfill';

// Force usage of polyfill if native not present
const BarcodeDetectorClass = (window as any).BarcodeDetector || BarcodeDetectorPolyfill;

interface BarcodeDetectorOptions {
    formats: string[];
}

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

declare class BarcodeDetector {
    constructor(options?: BarcodeDetectorOptions);
    static getSupportedFormats(): Promise<string[]>;
    detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        BarcodeDetector: any;
    }
}

export type ScanStatus = 'pending' | 'processing' | 'success' | 'error';

export interface MultiQRScannerProps {
    onCodesDetected: (codes: DetectedBarcode[]) => void;
    codeStatuses?: Map<string, ScanStatus>;
    scanInterval?: number;
    className?: string;
    style?: React.CSSProperties;
}

const MultiQRScanner: React.FC<MultiQRScannerProps> = ({
    onCodesDetected,
    codeStatuses = new Map(),
    scanInterval = 600,
    className,
    style
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isSupported, setIsSupported] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

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
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error('Error accessing webcam:', err);
                setError('Could not access webcam. Please verify permissions.');
            }
        };

        startCamera();

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    useEffect(() => {
        if (!isSupported || !videoRef.current || !canvasRef.current) return;

        const barcodeDetector = new BarcodeDetectorClass({ formats: ['qr_code'] });
        let animationFrameId: number;
        let lastDetectTime = 0;

        const detectCodes = async (timestamp: number) => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                if (timestamp - lastDetectTime >= scanInterval) {
                    lastDetectTime = timestamp;
                    try {
                        const barcodes = await barcodeDetector.detect(videoRef.current);

                        // Pass detected codes to parent
                        onCodesDetected(barcodes);

                        // Draw overlay based on statuses passed from parent
                        drawOverlay(barcodes);
                    } catch (err) {
                        console.error('Barcode detection error:', err);
                    }
                }
            }
            animationFrameId = requestAnimationFrame(detectCodes);
        };

        animationFrameId = requestAnimationFrame(detectCodes);

        return () => cancelAnimationFrame(animationFrameId);
    }, [isSupported, scanInterval, onCodesDetected, codeStatuses]); // Re-run if props change

    const drawOverlay = (barcodes: DetectedBarcode[]) => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        barcodes.forEach(barcode => {
            const value = barcode.rawValue;
            const status = codeStatuses.get(value);

            let color = '#FFFFFF'; // Default white (NEW)
            if (status === 'processing') color = '#FFFF00'; // Yellow
            if (status === 'success') color = '#00FF00'; // Green
            if (status === 'error') color = '#FF0000'; // Red

            // Draw detected polygon
            ctx.beginPath();
            barcode.cornerPoints.forEach((point, index) => {
                if (index === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            ctx.closePath();
            ctx.lineWidth = 4;
            ctx.strokeStyle = color;
            ctx.stroke();

            // Draw label background
            const firstPoint = barcode.cornerPoints[0];
            const statusText = status ? `[${status.toUpperCase()}]` : '[NEW]';

            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = color;
            ctx.fillText(`${value} ${statusText}`, firstPoint.x, firstPoint.y - 10);
        });
    };

    return (
        <div className={className} style={{ position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto', ...style }}>
            {/* Header / Child components can be rendered here or by parent */}
            {/* We can keep the basic header or make it optional. For library, keep it simple/removable */}

            {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

            <div style={{ position: 'relative' }}>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', display: 'block' }}
                />
                <canvas
                    ref={canvasRef}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none'
                    }}
                />
            </div>

            {/* Debug/Info overlay could be passed as children if needed, 
                but for now we focus on the visual overlay functionality */}
        </div>
    );
};

export default MultiQRScanner;
