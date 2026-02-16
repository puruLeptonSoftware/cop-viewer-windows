import React, { useMemo } from 'react';

interface TapeProps {
  label: string;
  currentValue: number | null;
  step: number;
  numValues?: number;
  position: 'left' | 'right';
  className?: string;
}

export const Tape: React.FC<TapeProps> = ({
  label,
  currentValue,
  step,
  numValues = 12,
  position,
  className = '',
}) => {
  const isLeft = position === 'left';

  // Calculate values array
  const values = useMemo(() => {
    if (currentValue === null || !Number.isFinite(currentValue)) return [];
    const centerValue = Math.round(currentValue / step) * step;
    const result: number[] = [];
    for (let i = -numValues / 2; i <= numValues / 2; i++) {
      result.push(centerValue + i * step);
    }
    return result;
  }, [currentValue, step, numValues]);

  if (currentValue === null || !Number.isFinite(currentValue) || values.length === 0) {
    return null;
  }

  const current = Math.round(currentValue);

  return (
    <div
      
      className={`absolute ${isLeft ? 'left-[20px]' : 'right-[20px]'} bottom-[20px] w-[110px] h-[350px] z-[1002] pointer-events-none overflow-hidden ${className}`}
    >
      {/* Main Tape Container - Changed background color with border radius */}
      <div className="relative w-full h-full bg-gray-900 border-l border-r border-cyan-300/60 rounded-lg">
        {/* Label Section - Centered */}
        <div className="absolute top-0 left-0 right-0 h-12 flex items-center justify-center border-b border-white/30 z-20 bg-gray-900 rounded-t-lg">
          <span className="text-[15px] font-bold text-cyan-300 uppercase font-mono tracking-widest">
            {label}
          </span>
        </div>

        {/* Tape Content Area */}
        <div className="relative w-full h-full pt-12 pb-5 overflow-hidden rounded-b-lg">
          {/* Scale Values - Consistent spacing for both left and right */}
          {values.map((value) => {
            const diff = value - current;
            // Use consistent multiplier for both tapes
            const multiplier = step === 10 ? 7 : 10;
            const yPos = 50 + (diff / step) * multiplier;
            
            // Only show values within visible range - ensure they don't enter heading area
            if (yPos < 15 || yPos > 95) return null;
            
            // Determine if it's a major tick mark
            const isMajorTick = step === 10 ? (value % 50 === 0) : (value % 500 === 0);
            
            return (
              <div
                key={value}
                className={`absolute ${isLeft ? 'left-0' : 'right-0'} w-full flex items-center ${isLeft ? 'justify-start' : 'justify-end'} -translate-y-1/2 z-[1]`}
                style={{ 
                  top: `${yPos}%`, 
                  paddingLeft: isLeft ? '12px' : '0', 
                  paddingRight: !isLeft ? '12px' : '0' 
                }}
              >
                {isLeft && (
                  <div className="w-[10px] h-px bg-white/95 mr-3" />
                )}
                <span className={`${isMajorTick ? 'text-[19px]' : 'text-[18px]'} font-bold text-white font-mono tracking-tight`}>
                  {value >= 0 ? value : 0}
                </span>
                {!isLeft && (
                  <div className="w-[10px] h-px bg-white/95 ml-3" />
                )}
              </div>
            );
          })}
          
          {/* Center Reference Line */}
          <div className="absolute left-0 right-0 top-1/2 h-px bg-white/20 z-[2]" />
          
          {/* Current Value Box - Reduced size */}
          <div className="absolute left-0 right-0 top-1/2 z-[5] flex -translate-y-1/2 items-center justify-center">
            {/* Left Blue Vertical Line */}
            <div className="absolute left-0 w-[2px] h-20 bg-cyan-300" />
            
            {/* Current Value Box - Smaller size */}
            <div className="relative px-4 py-1.5 bg-blue-600 border-2 border-blue-400 rounded">
              <span className="text-[20px] font-bold text-white font-mono tracking-wide">
                {current >= 0 ? current : 0}
              </span>
            </div>
            
            {/* Right Blue Vertical Line */}
            <div className="absolute right-0 w-[2px] h-20 bg-cyan-300" />
          </div>
        </div>
      </div>
    </div>
  );
};
