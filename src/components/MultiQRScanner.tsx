import React, { useEffect, useRef, useMemo } from 'react';
import { useMultiQRScanner } from '../hooks/useMultiQRScanner';
import type { DetectedBarcode } from '../hooks/useMultiQRScanner';
export type { DetectedBarcode };

export type ScanStatus = 'pending' | 'processing' | 'success' | 'error';

export interface MultiQRScannerProps {
    onCodesDetected: (codes: DetectedBarcode[]) => void;
    codeStatuses?: Map<string, ScanStatus>;
    scanInterval?: number;
    className?: string;
    style?: React.CSSProperties;
    // UI Customization Props
    title?: string;
    showFrame?: boolean;
    showScanLine?: boolean;
    scanLineColor?: string;
    frameColor?: string;
    overlayColor?: string;
    containerStyle?: React.CSSProperties;
    children?: React.ReactNode;
    isEnabled?: boolean;
    facingMode?: 'user' | 'environment';
    statusColors?: Partial<Record<ScanStatus, string>>;
    showCorners?: boolean; // Alias for showFrame
    // Enhanced Props
    torch?: boolean;
    onTorchAvailable?: (available: boolean) => void;
    scanRegion?: { x: number; y: number; width: number; height: number }; // Percentage (0-100)
    renderDetectedCode?: (barcode: DetectedBarcode, status?: ScanStatus) => React.ReactNode;
}

const MultiQRScanner: React.FC<MultiQRScannerProps> = ({
    onCodesDetected,
    codeStatuses = new Map(),
    scanInterval = 600,
    className,
    style,
    title = 'ĐƯA MÃ QR CODE VÀO ĐÂY ĐỂ ĐIỂM DANH',
    showFrame = true,
    showScanLine = true,
    scanLineColor = '#FFFFFF',
    frameColor = '#FFFFFF',
    overlayColor = 'rgba(0, 0, 0, 0.5)',
    containerStyle,
    children,
    isEnabled = true,
    facingMode = 'environment',
    statusColors = {},
    showCorners,
    torch = false,
    onTorchAvailable,
    scanRegion,
    renderDetectedCode
}) => {
    const {
        videoRef,
        isTorchAvailable,
        isTorchOn,
        toggleTorch,
        error
    } = useMultiQRScanner({
        isEnabled,
        scanInterval,
        facingMode,
        onCodesDetected: (codes: DetectedBarcode[]) => {
            // Filter by scanRegion if provided
            if (scanRegion && videoRef.current) {
                const video = videoRef.current;
                const roiX = (scanRegion.x / 100) * video.videoWidth;
                const roiY = (scanRegion.y / 100) * video.videoHeight;
                const roiW = (scanRegion.width / 100) * video.videoWidth;
                const roiH = (scanRegion.height / 100) * video.videoHeight;

                const filteredCodes = codes.filter((code: DetectedBarcode) => {
                    const box = code.boundingBox;
                    return (
                        box.x >= roiX &&
                        box.y >= roiY &&
                        box.x + box.width <= roiX + roiW &&
                        box.y + box.height <= roiY + roiH
                    );
                });
                onCodesDetected(filteredCodes);
                drawOverlay(filteredCodes);
            } else {
                onCodesDetected(codes);
                drawOverlay(codes);
            }
        }
    });

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const colors = useMemo(() => ({
        pending: '#FFFFFF',
        processing: '#FFFF00',
        success: '#00FF00',
        error: '#FF0000',
        ...statusColors
    }), [statusColors]);

    useEffect(() => {
        if (onTorchAvailable) onTorchAvailable(isTorchAvailable);
    }, [isTorchAvailable, onTorchAvailable]);

    useEffect(() => {
        if (torch !== isTorchOn) {
            toggleTorch();
        }
    }, [torch, isTorchOn, toggleTorch]);

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

        // If custom renderer is provided, we might still want to draw the polygon 
        // but not the label, or skip drawing entirely and let children handle it.
        barcodes.forEach(barcode => {
            const status = codeStatuses.get(barcode.rawValue);
            const color = (status && colors[status as ScanStatus]) ? colors[status as ScanStatus] : colors.pending;

            // Always draw the detection border
            ctx.beginPath();
            barcode.cornerPoints.forEach((point, index) => {
                if (index === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            });
            ctx.closePath();
            ctx.lineWidth = 4;
            ctx.strokeStyle = color;
            ctx.stroke();

            // Only draw label if NO custom renderer is provided
            if (!renderDetectedCode) {
                const firstPoint = barcode.cornerPoints[0];
                const statusText = status ? `[${status.toUpperCase()}]` : '[NEW]';
                ctx.font = 'bold 16px Arial';
                ctx.fillStyle = color;
                ctx.fillText(`${barcode.rawValue} ${statusText}`, firstPoint.x, firstPoint.y - 10);
            }
        });
    };

    const isFrameVisible = showCorners !== undefined ? showCorners : showFrame;

    return (
        <div
            className={className}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                backgroundColor: '#000',
                ...containerStyle,
                ...style
            }}
        >
            <style>
                {`
                    @keyframes scan {
                        0% { top: 0%; }
                        100% { top: 100%; }
                    }
                    .scanner-container {
                        position: relative;
                        width: 100%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .scanner-video {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                    .scanner-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        pointer-events: none;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    .scanner-hole-container {
                        position: relative;
                        width: 100%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .scanner-hole {
                        position: relative;
                        width: 100%;
                        height: 100%;
                        box-shadow: 0 0 0 9999px ${overlayColor};
                        overflow: hidden;
                    }
                    .roi-region {
                        position: absolute;
                        border: 2px dashed ${frameColor};
                        box-shadow: 0 0 0 9999px ${overlayColor};
                        z-index: 10;
                    }
                    .scanner-corner {
                        position: absolute;
                        width: 40px;
                        height: 40px;
                        border: 4px solid ${frameColor};
                        z-index: 11;
                    }
                    .corner-tl { top: 0; left: 0; border-right: none; border-bottom: none; border-top-left-radius: 24px; }
                    .corner-tr { top: 0; right: 0; border-left: none; border-bottom: none; border-top-right-radius: 24px; }
                    .corner-bl { bottom: 0; left: 0; border-right: none; border-top: none; border-bottom-left-radius: 24px; }
                    .corner-br { bottom: 0; right: 0; border-left: none; border-top: none; border-bottom-right-radius: 24px; }
                    
                    .scan-line {
                        position: absolute;
                        left: 0;
                        right: 0;
                        height: 2px;
                        background: ${scanLineColor};
                        box-shadow: 0 0 8px ${scanLineColor};
                        animation: scan 3s linear infinite;
                        opacity: 0.8;
                    }
                    .scanner-title {
                        position: absolute;
                        top: 15px;
                        background: rgba(0, 0, 0, 0.6);
                        backdrop-filter: blur(4px);
                        color: white;
                        padding: 6px 20px;
                        border-radius: 20px;
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        z-index: 20;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        white-space: nowrap;
                    }
                `}
            </style>

            {error && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    background: 'rgba(255, 0, 0, 0.7)',
                    padding: '20px',
                    borderRadius: '8px',
                    zIndex: 100,
                    textAlign: 'center'
                }}>
                    {error}
                </div>
            )}

            <div className="scanner-container">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="scanner-video"
                />
                <canvas
                    ref={canvasRef}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        objectFit: 'cover',
                        zIndex: 5
                    }}
                />

                <div className="scanner-overlay">
                    {title && <div className="scanner-title">{title}</div>}

                    <div className="scanner-hole-container">
                        {scanRegion ? (
                            <div
                                className="roi-region"
                                style={{
                                    left: `${scanRegion.x}%`,
                                    top: `${scanRegion.y}%`,
                                    width: `${scanRegion.width}%`,
                                    height: `${scanRegion.height}%`
                                }}
                            >
                                {isFrameVisible && (
                                    <>
                                        <div className="scanner-corner corner-tl" />
                                        <div className="scanner-corner corner-tr" />
                                        <div className="scanner-corner corner-bl" />
                                        <div className="scanner-corner corner-br" />
                                    </>
                                )}
                                {showScanLine && isEnabled && <div className="scan-line" />}
                            </div>
                        ) : (
                            <div className="scanner-hole">
                                {isFrameVisible && (
                                    <div className="scanner-frame">
                                        <div className="scanner-corner corner-tl" />
                                        <div className="scanner-corner corner-tr" />
                                        <div className="scanner-corner corner-bl" />
                                        <div className="scanner-corner corner-br" />
                                    </div>
                                )}
                                {showScanLine && isEnabled && <div className="scan-line" />}
                            </div>
                        )}
                    </div>
                </div>

                {/* Layer for custom rendered detected codes */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 12 }}>
                    {/* Note: In a real implementation, we would need to map barcode.boundingBox (video pixels) 
                        to CSS percentage/pixels to render JSX correctly positioned. 
                        For now, we just pass the children Slot. */}
                    {children}
                </div>
            </div>
        </div>
    );
};

export default MultiQRScanner;
