"use client";

import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Info } from 'lucide-react';

export default function VenueMap({
  venue,
  eventId,
  seats,
  onSeatClick,
  selectedSeatIds,
  zonePricing,
  currency = 'ZAR',
  onSectionClick, // optional: click whole section to navigate
}) {
  const [hoveredSeat, setHoveredSeat] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);

  const { width: viewWidth, height: viewHeight } = venue.mapDimensions;

  // Create a map of seat positions from venue config (if present)
  const seatPositionMap = new Map();
  if (Array.isArray(venue.sections)) {
    venue.sections.forEach((section) => {
      if (Array.isArray(section.seats)) {
        section.seats.forEach((seatConfig) => {
          const key = `${section.sectionId}-${seatConfig.row}-${seatConfig.seatNumber}`;
          seatPositionMap.set(key, seatConfig.position);
        });
      }
    });
  }

  // Merge seat status with position
  let seatsWithPosition = seats
    .map((seat) => {
      const key = `${seat.zoneId}-${seat.row}-${seat.seatNumber}`;
      const position = seatPositionMap.get(key) || seat.position;
      return { ...seat, position };
    })
    .filter((seat) => seat.position);

  // Fallback: if no explicit positions configured anywhere,
  // lay out seats inside their corresponding zone/section shapes
  if (seatsWithPosition.length === 0 && seats.length > 0 && Array.isArray(venue.sections)) {
    const seatsByZone = new Map();
    seats.forEach((seat) => {
      if (!seatsByZone.has(seat.zoneId)) {
        seatsByZone.set(seat.zoneId, []);
      }
      seatsByZone.get(seat.zoneId).push(seat);
    });

    const tempSeatsWithPos = [];

    venue.sections.forEach((section) => {
      const zoneSeats = seatsByZone.get(section.sectionId) || [];
      if (zoneSeats.length === 0 || !Array.isArray(section.boundary) || section.boundary.length === 0) {
        return;
      }

      // Compute a simple bounding box for the section polygon
      const xs = section.boundary.map((p) => p.x);
      const ys = section.boundary.map((p) => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const paddingX = (maxX - minX) * 0.08;
      const paddingY = (maxY - minY) * 0.12;

      const innerMinX = minX + paddingX;
      const innerMaxX = maxX - paddingX;
      const innerMinY = minY + paddingY;
      const innerMaxY = maxY - paddingY;

      const width = innerMaxX - innerMinX;
      const height = innerMaxY - innerMinY;

      // Decide number of columns based on width and seat count
      const idealColCount = Math.min(
        Math.max(Math.round(width / 25), 8),
        Math.max(12, Math.ceil(zoneSeats.length / 3))
      );
      const columns = Math.max(4, idealColCount);
      const rows = Math.ceil(zoneSeats.length / columns);

      const gapX = width / Math.max(columns - 1, 1);
      const gapY = rows > 1 ? height / Math.max(rows - 1, 1) : 0;

      zoneSeats.forEach((seat, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);

        const x = innerMinX + col * gapX;
        const y = rows === 1 ? (innerMinY + innerMaxY) / 2 : innerMinY + row * gapY;

        tempSeatsWithPos.push({
          ...seat,
          position: { x, y },
        });
      });
    });

    // If we managed to place any seats using section shapes, use that layout.
    // Otherwise, fall back to the simple central grid.
    if (tempSeatsWithPos.length > 0) {
      seatsWithPosition = tempSeatsWithPos;
    } else {
      const columns = 18;
      const horizontalPadding = viewWidth * 0.2;
      const usableWidth = viewWidth - horizontalPadding * 2;
      const gapX = usableWidth / Math.max(columns - 1, 1);
      const gapY = 24;

      const startY = venue.stagePosition
        ? venue.stagePosition.y + 80
        : viewHeight * 0.3;
      const startX = viewWidth / 2 - usableWidth / 2;

      seatsWithPosition = seats.map((seat, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        return {
          ...seat,
          position: {
            x: startX + col * gapX,
            y: startY + row * gapY,
          },
        };
      });
    }
  }

  const viewBox = `${-panOffset.x} ${-panOffset.y} ${viewWidth / zoomLevel} ${viewHeight / zoomLevel}`;

  const boundaryToPath = (boundary) => {
    if (boundary.length === 0) return '';
    const pathParts = boundary.map((point, idx) =>
      `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    );
    return pathParts.join(' ') + ' Z';
  };

  const getSeatColor = (seat, isSelected) => {
    if (isSelected) return '#10B981';

    switch (seat.status) {
      case 'AVAILABLE':
        return '#E5E7EB';
      case 'HELD':
        return '#FCD34D'; // Yellow-300
      case 'LOCKED':
        return '#F97316'; // Orange-500
      case 'SOLD':
        return '#6B7280'; // Gray-500
      case 'BLOCKED':
        return '#DC2626'; // Red-600
      default:
        return '#E5E7EB';
    }
  };

  const isSeatClickable = (seat, isSelected) => {
    // Allow clicking if seat is selected (for deselection) or available
    if (isSelected) return true;
    return seat.status === 'AVAILABLE' || (seat.status === 'LOCKED' && seat.holdExpiresAt && new Date(seat.holdExpiresAt) < new Date());
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPanOffset(prev => ({
        x: prev.x - dx / zoomLevel,
        y: prev.y - dy / zoomLevel,
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleReset = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const getZoneName = (zoneId) => {
    const section = venue.sections.find(s => s.sectionId === zoneId);
    return section?.name || zoneId;
  };

  return (
    <div className="venue-map-container bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">{venue.name}</h2>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomIn}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-[#E5E7EB] border border-gray-400"></div>
          <span className="text-sm text-gray-700">Available</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-[#10B981] border border-green-700"></div>
          <span className="text-sm text-gray-700">Selected</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-[#FCD34D] border border-yellow-700"></div>
          <span className="text-sm text-gray-700">Held</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-[#F97316] border border-orange-700"></div>
          <span className="text-sm text-gray-700">Locked</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-[#6B7280] border border-gray-700"></div>
          <span className="text-sm text-gray-700">Sold</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-[#DC2626] border border-red-700"></div>
          <span className="text-sm text-gray-700">Blocked</span>
        </div>
      </div>

      {/* SVG Map */}
      <div className="relative bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
        <svg
          ref={svgRef}
          width="100%"
          height="600"
          viewBox={viewBox}
          className={`venue-svg ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Stage */}
          {venue.stagePosition && (
            <g>
              <rect
                x={venue.stagePosition.x - 150}
                y={venue.stagePosition.y - 30}
                width={300}
                height={60}
                fill="#1E40AF"
                rx={5}
              />
              <text
                x={venue.stagePosition.x}
                y={venue.stagePosition.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="20"
                fontWeight="bold"
              >
                STAGE
              </text>
            </g>
          )}

          {/* Render Sections */}
          {venue.sections.map((section) => (
            <g
              key={section.sectionId}
              style={{ cursor: onSectionClick ? 'pointer' : 'default' }}
              onClick={(e) => {
                // Allow section clicks without stealing seat clicks
                if (e.target.tagName !== 'circle' && onSectionClick) {
                  e.stopPropagation();
                  onSectionClick(section.sectionId);
                }
              }}
            >
              <path
                d={boundaryToPath(section.boundary)}
                fill={section.color}
                fillOpacity={0.2}
                stroke={section.color}
                strokeWidth={2}
              />

              {section.boundary.length > 0 && (
                <text
                  x={section.boundary[0].x + 50}
                  y={section.boundary[0].y + 50}
                  fontSize="24"
                  fontWeight="bold"
                  fill="#000"
                  opacity={0.7}
                >
                  {section.name}
                </text>
              )}
            </g>
          ))}

          {/* Render Seats */}
          {seatsWithPosition.map((seat) => {
            if (!seat.position) return null;

            const isSelected = selectedSeatIds.has(seat._id);
            const seatColor = getSeatColor(seat, isSelected);
            const clickable = isSeatClickable(seat, isSelected);

            return (
              <g
                key={seat._id}
                transform={`translate(${seat.position.x}, ${seat.position.y})`}
                style={{ cursor: clickable ? 'pointer' : 'not-allowed' }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (clickable) onSeatClick(seat);
                }}
                onMouseEnter={() => setHoveredSeat(seat)}
                onMouseLeave={() => setHoveredSeat(null)}
              >
                <circle
                  r={6}
                  fill={seatColor}
                  stroke={isSelected ? '#059669' : '#374151'}
                  strokeWidth={isSelected ? 2 : 1}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredSeat && (
          <div className="absolute top-4 right-4 bg-white border-2 border-gray-800 p-4 rounded-lg shadow-xl z-10 min-w-[200px]">
            <div className="flex items-start space-x-2 mb-2">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900">Seat Details</p>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Section:</span>
                <span className="font-semibold">{getZoneName(hoveredSeat.zoneId)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Row:</span>
                <span className="font-semibold">{hoveredSeat.row}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Seat:</span>
                <span className="font-semibold">{hoveredSeat.seatNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-semibold ${hoveredSeat.status === 'AVAILABLE' ? 'text-green-600' :
                  hoveredSeat.status === 'HELD' ? 'text-yellow-600' :
                    hoveredSeat.status === 'SOLD' ? 'text-gray-600' :
                      'text-red-600'
                  }`}>
                  {hoveredSeat.status}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-gray-600">Price:</span>
                <span className="font-bold text-blue-600">
                  {currency} {zonePricing.get(hoveredSeat.zoneId) || 0}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pricing Info */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-bold text-gray-900 mb-3">Section Pricing</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {venue.sections.map((section) => (
            <div
              key={section.sectionId}
              className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
            >
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: section.color }}
                ></div>
                <span className="text-sm font-medium text-gray-700">
                  {section.name}
                </span>
              </div>
              <span className="text-sm font-bold text-blue-600">
                {currency} {zonePricing.get(section.sectionId) || 0}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}