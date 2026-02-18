import { useRef, useEffect, useState } from 'react';
import { UDPDataPoint } from '../../../utils/types/udp';

interface HeadingPanelProps {
  member: UDPDataPoint;
}

export function HeadingPanel({ member }: HeadingPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const svgRef = useRef<HTMLImageElement | null>(null);
  const [svgLoaded, setSvgLoaded] = useState(false);

  useEffect(() => {
    // Load SVG image
    const img = new Image();
    img.src = 'icons/fighter-jet-white.svg';
    img.onload = () => {
      svgRef.current = img;
      setSvgLoaded(true);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !svgLoaded) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const labelPadding = 30;
    const radius = Math.min(centerX, centerY) - labelPadding;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw radial gradient background
    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius + labelPadding);
    bgGradient.addColorStop(0, 'rgba(0, 40, 0, 0.4)');
    bgGradient.addColorStop(0.3, 'rgba(0, 25, 0, 0.3)');
    bgGradient.addColorStop(0.6, 'rgba(0, 15, 0, 0.2)');
    bgGradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    ctx.fillStyle = bgGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + labelPadding, 0, Math.PI * 2);
    ctx.fill();

    // Draw outer ring (main compass border)
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw concentric rings with subtle radial glow
    for (let i = 1; i <= 4; i++) {
      const ringRadius = (radius * i) / 5;
      ctx.strokeStyle = `rgba(255, 255, 0, ${0.08 + i * 0.03})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw tick marks around the compass
    for (let deg = 0; deg < 360; deg += 10) {
      const angle = ((deg - 90) * Math.PI) / 180;
      const isMajor = deg % 90 === 0;
      const isMinor = deg % 30 === 0;
      const tickStart = isMajor ? 0.85 : isMinor ? 0.9 : 0.93;
      ctx.strokeStyle = isMajor ? 'rgba(255, 255, 0, 0.7)' : 'rgba(255, 255, 0, 0.25)';
      ctx.lineWidth = isMajor ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(
        centerX + Math.cos(angle) * radius * tickStart,
        centerY + Math.sin(angle) * radius * tickStart
      );
      ctx.lineTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
      ctx.stroke();
    }

    // Draw cardinal direction lines (thin, from center)
    const directions = [
      { label: 'N', angle: -90 },
      { label: 'E', angle: 0 },
      { label: 'S', angle: 90 },
      { label: 'W', angle: 180 },
    ];
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    directions.forEach((dir) => {
      const angle = (dir.angle * Math.PI) / 180;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * radius * 0.82,
        centerY + Math.sin(angle) * radius * 0.82
      );
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Draw cardinal labels outside the ring
    directions.forEach((dir) => {
      const angle = (dir.angle * Math.PI) / 180;
      const isNorth = dir.label === 'N';
      ctx.fillStyle = isNorth ? '#ff4444' : 'rgba(255, 255, 0, 1)';
      ctx.font = `bold ${isNorth ? '22' : '20'}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Add text glow
      ctx.save();
      ctx.shadowColor = isNorth ? 'rgba(255, 68, 68, 0.8)' : 'rgba(255, 255, 0, 0.6)';
      ctx.shadowBlur = 8;
      const labelDistance = radius + labelPadding - 16;
      ctx.fillText(
        dir.label,
        centerX + Math.cos(angle) * labelDistance,
        centerY + Math.sin(angle) * labelDistance
      );
      ctx.restore();
    });

    const heading = member.trueHeading ?? member.heading;
    if (heading !== undefined) {
      let normalizedHeading = heading;
      while (normalizedHeading < 0) normalizedHeading += 360;
      while (normalizedHeading >= 360) normalizedHeading -= 360;
      
      const headingRad = ((normalizedHeading - 90) * Math.PI) / 180;
      
      // Draw heading line with glow
      ctx.save();
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 6;
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(
        centerX + Math.cos(headingRad) * 35,
        centerY + Math.sin(headingRad) * 35
      );
      ctx.lineTo(
        centerX + Math.cos(headingRad) * radius * 0.82,
        centerY + Math.sin(headingRad) * radius * 0.82
      );
      ctx.stroke();
      ctx.restore();

      // Draw arrowhead at the end of the heading line
      const arrowLen = 10;
      const arrowAngle = 0.4;
      const tipX = centerX + Math.cos(headingRad) * radius * 0.82;
      const tipY = centerY + Math.sin(headingRad) * radius * 0.82;
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(
        tipX - Math.cos(headingRad - arrowAngle) * arrowLen,
        tipY - Math.sin(headingRad - arrowAngle) * arrowLen
      );
      ctx.lineTo(
        tipX - Math.cos(headingRad + arrowAngle) * arrowLen,
        tipY - Math.sin(headingRad + arrowAngle) * arrowLen
      );
      ctx.closePath();
      ctx.fill();
      
      // Draw plane icon at center with golden radial glow
      if (svgRef.current) {
        ctx.save();
        ctx.translate(centerX, centerY);
        
        ctx.rotate(headingRad + Math.PI / 2);
        
        // Plane icon
        ctx.drawImage(svgRef.current, -22, -22, 44, 44);
        ctx.restore();
      }
    }
  }, [member, svgLoaded]);

  const heading = member.trueHeading ?? member.heading;
  let displayHeading: string = 'N/A';
  if (heading !== undefined) {
    let h = heading;
    while (h < 0) h += 360;
    while (h >= 360) h -= 360;
    displayHeading = `${h.toFixed(1)}°`;
  }

  return (
    <div className="flex flex-col py-2">
      <div className="text-lg font-bold text-white mb-3">
        Headings: {displayHeading}
      </div>
      <div className="w-full" style={{ aspectRatio: '1 / 1', maxWidth: '230px', maxHeight: '230px' }}>
        <canvas
          ref={canvasRef}
          width={230}
          height={230}
          className="block w-full h-full"
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 0, 0.3)',
            borderRadius: '50%',
          }}
        />
      </div>
    </div>
  );
}

