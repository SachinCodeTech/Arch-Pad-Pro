import { useEffect, useState } from 'react';

interface SplashProps {
  onComplete: () => void;
  appIconSvg: string;
}

export default function Splash({ onComplete, appIconSvg }: SplashProps) {
  const [hide, setHide] = useState(false);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    // Progress loader simulation
    const interval = setInterval(() => {
      setPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 150);

    const timeout = setTimeout(() => {
      setHide(true);
      setTimeout(onComplete, 600); // Wait for transition before notifying parent
    }, 2400);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onComplete]);

  return (
    <div
      id="splash"
      className={`fixed inset-0 z-[9999] bg-[#0a0a0f] flex flex-col items-center justify-center gap-3.5 transition-all duration-600 ${
        hide ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="w-[72px] h-[72px] rounded-[20px] overflow-hidden shadow-[0_0_40px_rgba(79,142,247,0.3)]">
        <img src={appIconSvg} alt="Arch Pad Icon" className="w-full h-full block" />
      </div>
      <div className="text-[46px] font-[800] tracking-[-2px] bg-gradient-to-r from-[#4f8ef7] via-[#7c5cf7] to-[#f75c8e] bg-clip-text text-transparent select-none font-sans">
        Arch Pad
      </div>
      <div className="text-[10px] tracking-[5px] text-[#b0b0cc] uppercase font-[500] font-sans">
        Architectural Sketchbook
      </div>
      <div className="w-[180px] h-[2px] bg-[#18181f] rounded-[2px] mt-5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#4f8ef7] to-[#7c5cf7] rounded-[2px] transition-all duration-150"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <div className="font-mono text-[10px] text-[#8888aa] tracking-[1px]">
        Loading Workspace {Math.min(percent, 100)}%…
      </div>
    </div>
  );
}
