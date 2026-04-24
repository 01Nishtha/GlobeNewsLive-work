'use client';

import React, { useState, useEffect, useRef, useCallback } from "react";

interface GlobeProps {
  className?: string;
  autoRotate?: boolean;
}

const LOOP = 400;
const SPEED_PX_PER_SEC = LOOP / 30;

const Globe: React.FC<GlobeProps> = ({ className = "", autoRotate = true }) => {
  const [bgPos, setBgPos] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const posRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rafRef = useRef(0);

  const tick = useCallback((time: number) => {
    if (lastTimeRef.current === 0) lastTimeRef.current = time;
    const dt = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    if (autoRotate && !isHovered && !isDragging) {
      posRef.current = (posRef.current + SPEED_PX_PER_SEC * dt) % LOOP;
      setBgPos(posRef.current);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [autoRotate, isHovered, isDragging]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  // Window-level drag tracking
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      posRef.current = (posRef.current + delta) % LOOP;
      setBgPos(posRef.current);
    };
    const onUp = () => setIsDragging(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    lastXRef.current = e.clientX;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaX || e.deltaY;
    posRef.current = (posRef.current + delta * 0.5) % LOOP;
    setBgPos(posRef.current);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    lastXRef.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const delta = e.touches[0].clientX - lastXRef.current;
    lastXRef.current = e.touches[0].clientX;
    posRef.current = (posRef.current + delta) % LOOP;
    setBgPos(posRef.current);
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <>
      <style>
        {`
          @keyframes twinkling { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
          @keyframes twinkling-slow { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
          @keyframes twinkling-long { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
          @keyframes twinkling-fast { 0%,100% { opacity:0.1; } 50% { opacity:1; } }
        `}
      </style>
      <div
        className={`flex items-center justify-center h-full w-full select-none ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setIsDragging(false); }}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div
          className="relative w-[250px] h-[250px] rounded-full overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.2),-5px_0_8px_#c3f4ff_inset,15px_2px_25px_#000_inset,-24px_-2px_34px_#c3f4ff99_inset,250px_0_44px_#00000066_inset,150px_0_38px_#000000aa_inset]"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80')",
            backgroundSize: "cover",
            backgroundPosition: `${bgPos}px 0`,
          }}
        >
          <div className="absolute left-[-20px] w-1 h-1 bg-white rounded-full" style={{ animation: "twinkling 3s infinite" }} />
          <div className="absolute left-[-40px] top-[30px] w-1 h-1 bg-white rounded-full" style={{ animation: "twinkling-slow 2s infinite" }} />
          <div className="absolute left-[350px] top-[90px] w-1 h-1 bg-white rounded-full" style={{ animation: "twinkling-long 4s infinite" }} />
          <div className="absolute left-[200px] top-[290px] w-1 h-1 bg-white rounded-full" style={{ animation: "twinkling 3s infinite" }} />
          <div className="absolute left-[50px] top-[270px] w-1 h-1 bg-white rounded-full" style={{ animation: "twinkling-fast 1.5s infinite" }} />
          <div className="absolute left-[250px] top-[-50px] w-1 h-1 bg-white rounded-full" style={{ animation: "twinkling-long 4s infinite" }} />
          <div className="absolute left-[290px] top-[60px] w-1 h-1 bg-white rounded-full" style={{ animation: "twinkling-slow 2s infinite" }} />
        </div>
      </div>
    </>
  );
};

export default Globe;
