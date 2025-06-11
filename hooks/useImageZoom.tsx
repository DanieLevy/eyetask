import { useState, useCallback, useRef, useEffect } from 'react';

interface ZoomOptions {
  maxZoom?: number;
  minZoom?: number;
  zoomStep?: number;
  initialZoom?: number;
  onZoomChange?: (zoom: number) => void;
}

export function useImageZoom({
  maxZoom = 5,
  minZoom = 1,
  zoomStep = 0.5,
  initialZoom = 1,
  onZoomChange
}: ZoomOptions = {}) {
  const [zoom, setZoom] = useState(initialZoom);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  
  // Handle zoom change notification
  useEffect(() => {
    if (onZoomChange) {
      onZoomChange(zoom);
    }
  }, [zoom, onZoomChange]);

  // Handle zoom via wheel
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    setZoom(prevZoom => {
      const delta = e.deltaY < 0 ? zoomStep : -zoomStep;
      const newZoom = Math.max(minZoom, Math.min(maxZoom, prevZoom + delta));
      return newZoom;
    });
  }, [maxZoom, minZoom, zoomStep]);

  // Handle double tap/click to reset zoom
  const handleDoubleTap = useCallback(() => {
    if (zoom > minZoom) {
      setZoom(minZoom);
      setPosition({ x: 0, y: 0 });
    } else {
      setZoom(Math.min(maxZoom, minZoom + zoomStep * 3));
    }
  }, [zoom, maxZoom, minZoom, zoomStep]);

  // Handle drag to move when zoomed
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    if (zoom <= minZoom) return;
    
    setDragging(true);
    dragStartRef.current = { x: clientX, y: clientY };
    positionRef.current = { ...position };
  }, [zoom, minZoom, position]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragging || zoom <= minZoom) return;
    
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    
    setPosition({
      x: positionRef.current.x + dx,
      y: positionRef.current.y + dy
    });
  }, [dragging, zoom, minZoom]);

  const handleDragEnd = useCallback(() => {
    setDragging(false);
  }, []);

  // Handle pinch to zoom (touch events)
  const touchStartRef = useRef<Touch[]>([]);
  const initialDistanceRef = useRef<number>(0);
  const initialZoomRef = useRef<number>(zoom);

  const calculateDistance = (touches: Touch[]) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      // Two finger touch - pinch zoom
      touchStartRef.current = Array.from(e.touches);
      initialDistanceRef.current = calculateDistance(touchStartRef.current);
      initialZoomRef.current = zoom;
    } else if (e.touches.length === 1) {
      // One finger touch - pan if zoomed
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [zoom, handleDragStart]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault(); // Prevent scroll
    
    if (e.touches.length === 2) {
      // Handle pinch zoom
      const currentDistance = calculateDistance(Array.from(e.touches));
      const distanceRatio = currentDistance / initialDistanceRef.current;
      const newZoom = Math.max(
        minZoom,
        Math.min(maxZoom, initialZoomRef.current * distanceRatio)
      );
      setZoom(newZoom);
    } else if (e.touches.length === 1) {
      // Handle pan when zoomed
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [maxZoom, minZoom, handleDragMove]);

  // Set up event listeners on the container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Desktop events
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('dblclick', handleDoubleTap);
    
    // Touch events
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleDragEnd);
    
    // Mouse events for drag
    container.addEventListener('mousedown', (e) => handleDragStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => handleDragMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', handleDragEnd);
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('dblclick', handleDoubleTap);
      
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleDragEnd);
      
      container.removeEventListener('mousedown', (e) => handleDragStart(e.clientX, e.clientY));
      window.removeEventListener('mousemove', (e) => handleDragMove(e.clientX, e.clientY));
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [
    handleWheel, 
    handleDoubleTap, 
    handleDragStart, 
    handleDragMove, 
    handleDragEnd,
    handleTouchStart,
    handleTouchMove
  ]);

  // Reset position when zoom resets to minimum
  useEffect(() => {
    if (zoom <= minZoom) {
      setPosition({ x: 0, y: 0 });
    }
  }, [zoom, minZoom]);

  return {
    zoom,
    position,
    containerRef,
    imageRef,
    setZoom,
    setPosition,
    reset: () => {
      setZoom(minZoom);
      setPosition({ x: 0, y: 0 });
    },
    zoomIn: () => setZoom(prev => Math.min(maxZoom, prev + zoomStep)),
    zoomOut: () => setZoom(prev => Math.max(minZoom, prev - zoomStep))
  };
} 