import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, BookOpen, MapPin, Home, RotateCw, Map as MapIcon, Calendar } from 'lucide-react';
import { JourneyData, ReadingBook } from '../types';

declare const L: any; // Leaflet global from CDN

// Helper to calculate distance
const isValidNum = (n: any): boolean => typeof n === 'number' && !isNaN(n) && isFinite(n);
const validateCoord = (lat: any, lng: any): [number, number] | null => {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  return (isValidNum(latNum) && isValidNum(lngNum)) ? [latNum, lngNum] : null;
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  if (!isValidNum(lat1) || !isValidNum(lon1) || !isValidNum(lat2) || !isValidNum(lon2)) return 0;
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(Math.min(1, Math.max(0, a))), Math.sqrt(1 - Math.min(1, Math.max(0, a)))); 
  return isNaN(R * c) ? 0 : Math.round(R * c);
}

// Calculate bearing between two points
function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const toDeg = (rad: number) => rad * 180 / Math.PI;

  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

// Easing function for smoother animation
function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

interface ReadingMapProps {
  onBack: () => void;
  journeyData: JourneyData;
  onShowSummary: () => void;
}

const ReadingMap: React.FC<ReadingMapProps> = ({ onBack, journeyData, onShowSummary }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const planeMarkerRef = useRef<any>(null);
  const geoJsonLayerRef = useRef<any>(null);
  const animationFrameRef = useRef<number>();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [totalDistance, setTotalDistance] = useState(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const [viewMode, setViewMode] = useState<'focused' | 'overview'>('focused');
  
  const prevIndexRef = useRef(0);
  const readingList = journeyData.books;

  // Load GeoJSONs for highlighting
  useEffect(() => {
    const fetchGeoJSON = async () => {
      try {
        const worldRes = await fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json');
        const worldData = await worldRes.json();
        const chinaRes = await fetch('https://raw.githubusercontent.com/apache/echarts/master/test/data/map/json/china.json');
        const chinaData = await chinaRes.json();

        if (mapInstanceRef.current && !geoJsonLayerRef.current) {
            const layerGroup = L.layerGroup().addTo(mapInstanceRef.current);
            geoJsonLayerRef.current = layerGroup;

            const worldLayer = L.geoJSON(worldData, {
                style: { weight: 0, fillOpacity: 0, color: 'transparent' },
                onEachFeature: (feature: any, layer: any) => {
                    if (feature.id) feature.properties.searchKey = feature.id;
                }
            }).addTo(layerGroup);
            
            const chinaLayer = L.geoJSON(chinaData, {
                 style: { weight: 0, fillOpacity: 0, color: 'transparent' },
                 onEachFeature: (feature: any, layer: any) => {
                    feature.properties.searchKey = feature.properties.name; 
                 }
            }).addTo(layerGroup);

            (mapInstanceRef.current as any).worldLayer = worldLayer;
            (mapInstanceRef.current as any).chinaLayer = chinaLayer;
        }
      } catch (e) {
        console.warn("GeoJSON load failed, highlighting disabled", e);
      }
    };
    if (isMapReady) {
        fetchGeoJSON();
    }
  }, [isMapReady]);

  // Update Highlighting
  useEffect(() => {
    if (!mapInstanceRef.current || !readingList[currentIndex]) return;
    const map = mapInstanceRef.current;
    const currentBook = readingList[currentIndex];
    const { regionCode, isDomestic } = currentBook.location;
    
    if (!regionCode) return;

    if (map.worldLayer) map.worldLayer.setStyle({ fillOpacity: 0, weight: 0 });
    if (map.chinaLayer) map.chinaLayer.setStyle({ fillOpacity: 0, weight: 0 });

    const highlightStyle = {
        fillColor: '#064e3b',
        fillOpacity: 0.2,
        weight: 1,
        color: '#064e3b',
        opacity: 0.4
    };

    if (isDomestic && map.chinaLayer) {
       // Highlight logic
    } else if (!isDomestic && map.worldLayer) {
         map.worldLayer.eachLayer((layer: any) => {
             if (layer.feature.id === regionCode) {
                 layer.setStyle(highlightStyle);
             }
         });
    }
  }, [currentIndex, readingList, isMapReady]);


  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    if (readingList.length === 0) return;

    const startCoords = validateCoord(readingList[0].location.lat, readingList[0].location.lng) || [30, 120];

    try {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: true,
        zoomAnimation: true,
        markerZoomAnimation: true
      });
      map.setView(startCoords, 3);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);
      mapInstanceRef.current = map;
      
      const observer = new ResizeObserver(() => map.invalidateSize());
      observer.observe(mapContainerRef.current);
      setIsMapReady(true);
    } catch (err) {
      console.error(err);
    }
    return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }
    };
  }, []);

  // Main Logic: Camera, Plane Animation, Path, Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapReady || readingList.length === 0) return;

    // Stop any pending animation to prevent "reading _leaflet_pos" error on destroyed markers
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    // --- 1. Camera & Plane Animation ---
    if (viewMode === 'overview') {
        const allPoints = readingList.map(b => validateCoord(b.location.lat, b.location.lng)).filter(p => p) as [number, number][];
        if (allPoints.length > 0) map.flyToBounds(L.latLngBounds(allPoints), { padding: [50, 50], duration: 2 });
        // Remove plane in overview
        if (planeMarkerRef.current) {
            planeMarkerRef.current.remove();
            planeMarkerRef.current = null;
        }
    } else {
        const coords = validateCoord(readingList[currentIndex].location.lat, readingList[currentIndex].location.lng);
        if (coords) {
             const prevIdx = prevIndexRef.current;
             const prevBook = readingList[prevIdx];
             const prevCoords = validateCoord(prevBook.location.lat, prevBook.location.lng);
             
             // Calculate Dynamic Duration based on Distance
             let duration = 2.0; // Default
             let distance = 0;
             if (prevCoords) {
                distance = calculateDistance(prevCoords[0], prevCoords[1], coords[0], coords[1]);
                // Scale: 0.5s for very short, up to 3.5s for long haul
                duration = Math.min(Math.max(distance / 1500, 1.5), 3.5);
             }

             // Fly to target
             map.flyTo(coords, 4, { animate: true, duration: duration, easeLinearity: 0.25 });

             // Handle Plane Animation (JS Loop)
             if (prevCoords && (currentIndex !== prevIdx)) {
                 const startLat = prevCoords[0];
                 const startLng = prevCoords[1];
                 const endLat = coords[0];
                 const endLng = coords[1];
                 
                 const bearing = calculateBearing(startLat, startLng, endLat, endLng);
                 
                 // Rounded cartoonish paper plane pointing UP (0deg)
                 const planeIconHtml = `
                    <div style="transform: rotate(${bearing}deg); width: 100%; height: 100%; filter: drop-shadow(0 8px 12px rgba(0,0,0,0.4)); transition: transform 0.1s linear;">
                         <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M24 4L42 40L24 32L6 40L24 4Z" fill="#064e3b" stroke="white" stroke-width="3" stroke-linejoin="round"/>
                            <path d="M24 4V32" stroke="white" stroke-width="2" stroke-linecap="round"/>
                         </svg>
                    </div>`;

                 const planeIcon = L.divIcon({
                     className: 'plane-icon', 
                     html: planeIconHtml,
                     iconSize: [48, 48],
                     iconAnchor: [24, 24]
                 });

                 if (!planeMarkerRef.current) {
                     planeMarkerRef.current = L.marker(prevCoords, { icon: planeIcon, zIndexOffset: 2000 }).addTo(map);
                 } else {
                     planeMarkerRef.current.setIcon(planeIcon);
                     planeMarkerRef.current.setLatLng(prevCoords);
                     planeMarkerRef.current.setOpacity(1);
                 }

                 // Animate Marker position manually to sync with flyTo
                 const startTime = performance.now();
                 
                 const animate = (currentTime: number) => {
                    // Check if map still exists to prevent error
                    if (!mapInstanceRef.current) return;

                    const elapsed = (currentTime - startTime) / 1000; // seconds
                    const progress = Math.min(elapsed / duration, 1);
                    const ease = easeInOutCubic(progress);

                    // Simple interpolation
                    const curLat = startLat + (endLat - startLat) * ease;
                    const curLng = startLng + (endLng - startLng) * ease;

                    if (planeMarkerRef.current) {
                        planeMarkerRef.current.setLatLng([curLat, curLng]);
                    }

                    if (progress < 1) {
                        animationFrameRef.current = requestAnimationFrame(animate);
                    }
                 };
                 animationFrameRef.current = requestAnimationFrame(animate);

             } else if (!planeMarkerRef.current && coords) {
                 // Initial static placement
                 // Optional: Only show plane when moving. 
             }
        }
    }
    prevIndexRef.current = currentIndex;

    // --- 2. Path & Distance ---
    const limit = viewMode === 'overview' ? readingList.length - 1 : currentIndex;
    let dist = 0;
    const path: [number, number][] = [];
    for (let i = 0; i <= limit; i++) {
        const c = validateCoord(readingList[i].location.lat, readingList[i].location.lng);
        if (c) {
            path.push(c);
            if (i > 0) {
                const prev = validateCoord(readingList[i-1].location.lat, readingList[i-1].location.lng);
                if (prev) dist += calculateDistance(prev[0], prev[1], c[0], c[1]);
            }
        }
    }
    setTotalDistance(dist);
    journeyData.totalDistance = dist; 

    if (polylineRef.current) polylineRef.current.remove();
    if (path.length > 1) {
        polylineRef.current = L.polyline(path, { color: '#064e3b', weight: 2, opacity: 0.5, dashArray: '4, 8' }).addTo(map);
    }

    // --- 3. Markers (Google Maps Style Pins) ---
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    
    // Google Maps Style Pin SVG
    const pinSvg = `
      <svg viewBox="0 0 24 24" fill="#064e3b" stroke="white" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5" fill="white"/>
      </svg>
    `;

    // Active Pin (Larger, bounced)
    const activePinIcon = L.divIcon({
      className: 'custom-pin active',
      html: `<div style="width: 100%; height: 100%; transform: scale(1.2);">${pinSvg}</div>`,
      iconSize: [36, 36], 
      iconAnchor: [18, 36], // Tip at bottom center
      popupAnchor: [0, -36]
    });

    // Inactive Pin (Smaller)
    const inactivePinIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="width: 100%; height: 100%; opacity: 0.8;">${pinSvg}</div>`,
        iconSize: [24, 24], 
        iconAnchor: [12, 24]
    });

    for (let i = 0; i <= (viewMode === 'overview' ? readingList.length - 1 : currentIndex); i++) {
        const c = validateCoord(readingList[i].location.lat, readingList[i].location.lng);
        if (c) {
            const isActive = viewMode === 'focused' && i === currentIndex;
            const m = L.marker(c, { icon: isActive ? activePinIcon : inactivePinIcon, zIndexOffset: isActive ? 1000 : 0 }).addTo(map);
            markersRef.current.push(m);
        }
    }

    // Cleanup animation frame on effect unmount/change to avoid updating destroyed markers
    return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };

  }, [currentIndex, isMapReady, viewMode, readingList]);

  // Autoplay Logic
  useEffect(() => {
    let interval: any;
    if (isPlaying && viewMode === 'focused') {
      interval = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= readingList.length - 1) {
            setIsPlaying(false);
            setViewMode('overview'); 
            setTimeout(() => {
                onShowSummary();
            }, 2000);
            return prev;
          }
          return prev + 1;
        });
      }, 4500); 
    }
    return () => clearInterval(interval);
  }, [isPlaying, viewMode, readingList.length, onShowSummary]);

  const currentBook = readingList[currentIndex];

  return (
    <div className="relative w-full h-screen bg-biblio-light overflow-hidden flex flex-col font-sans">
      <div id="map" ref={mapContainerRef} className="absolute inset-0 z-0 grayscale-[20%] sepia-[10%]" />

      {/* Header - Compact for Mobile */}
      <div className="absolute top-0 left-0 w-full p-2 md:p-6 z-10 flex flex-col md:flex-row justify-between items-start pointer-events-none">
        
        {/* Title Card */}
        <div className="bg-white/90 backdrop-blur-sm border-l-4 border-biblio-green p-3 md:p-5 shadow-lg pointer-events-auto mb-2 md:mb-0 max-w-[200px] md:max-w-sm rounded-r-sm flex flex-col gap-1 transition-all">
          <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
            <button onClick={onBack} className="group flex items-center gap-2 hover:bg-biblio-green/5 p-1 -ml-1 rounded transition-all pr-3">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-biblio-light flex items-center justify-center text-biblio-green group-hover:bg-biblio-green group-hover:text-white transition-colors">
                    <Home size={14} className="md:w-4 md:h-4" />
                </div>
                <span className="font-serif font-bold text-lg md:text-xl text-biblio-green tracking-tight">reading.map</span>
            </button>
          </div>
          <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-serif font-bold text-biblio-green">{totalDistance.toLocaleString()}</span>
              <span className="text-[10px] md:text-xs font-sans uppercase tracking-widest text-biblio-green/60">km Traveled</span>
          </div>
        </div>

        {/* Dynamic Card - Repositioned for Mobile to be less obtrusive */}
        {viewMode === 'overview' ? (
             <div className="bg-biblio-green text-white p-6 md:p-8 shadow-2xl pointer-events-auto max-w-[90%] md:max-w-md w-full animate-in fade-in slide-in-from-right duration-700 mx-auto md:mx-0 rounded-sm">
                <div className="flex items-center gap-3 mb-3 md:mb-4 text-biblio-accent/80">
                    <MapIcon size={20} className="md:w-6 md:h-6" />
                    <span className="text-xs md:text-sm font-bold tracking-[0.2em] uppercase">旅程总结</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-serif font-bold mb-3 md:mb-4 leading-tight">世界即是书本</h2>
                <p className="text-white/80 leading-relaxed mb-4 md:mb-6 font-sans text-sm md:text-base line-clamp-3 md:line-clamp-4">
                    {journeyData.summaryComment}
                </p>
                <button onClick={onShowSummary} className="w-full py-2 md:py-3 bg-white text-biblio-green font-bold uppercase tracking-widest hover:bg-biblio-accent transition-colors flex items-center justify-center gap-2 text-sm md:text-base">
                    <BookOpen size={16} /> 查看年度明信片
                </button>
             </div>
        ) : currentBook && (
            <div key={currentBook.id} className="bg-biblio-green text-white p-4 md:p-6 shadow-xl pointer-events-auto max-w-[85%] md:max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-sm mx-auto md:mx-0 absolute bottom-32 md:static md:bottom-auto">
              <div className="flex justify-between items-start mb-2 md:mb-4">
                 <div className="bg-white/10 px-2 py-1 text-[10px] md:text-xs font-mono rounded backdrop-blur-sm">NO. {currentIndex + 1}</div>
                 <div className="text-biblio-accent font-serif italic text-sm md:text-lg">{currentBook.displayDate}</div>
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-bold mb-1 leading-tight line-clamp-1">{currentBook.title}</h2>
              <p className="text-biblio-accent mb-3 md:mb-4 font-medium text-xs md:text-base truncate">{currentBook.author}</p>
              <div className="border-t border-white/20 pt-3 md:pt-4 mb-1 md:mb-4">
                <div className="flex items-center gap-2 mb-2 text-xs md:text-sm font-bold text-biblio-accent">
                    <MapPin size={14} className="md:w-4 md:h-4" /> {currentBook.location.name}
                </div>
                <p className="text-sm md:text-lg italic font-serif opacity-90 leading-relaxed line-clamp-2 md:line-clamp-none">
                  "{currentBook.oneLiner}"
                </p>
              </div>
            </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 w-full p-4 md:p-8 z-10 bg-gradient-to-t from-biblio-light via-biblio-light/95 to-transparent pt-12 md:pt-24 pointer-events-none">
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-4 md:gap-6 pointer-events-auto">
          
          {/* Progress Timeline */}
          <div className="flex justify-between items-center px-2 relative mt-2 md:mt-6">
             {/* Floating Date Label */}
             {viewMode === 'focused' && currentBook && (
                 <div 
                   className="absolute -top-6 md:-top-8 transform -translate-x-1/2 transition-all duration-1000 ease-linear bg-biblio-green text-white text-[10px] md:text-xs px-2 py-1 rounded shadow-md whitespace-nowrap"
                   style={{ left: `${(currentIndex / (readingList.length - 1)) * 100}%` }}
                 >
                    {currentBook.displayDate}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-biblio-green"></div>
                 </div>
             )}

             <div className="absolute left-0 right-0 h-[2px] bg-gray-300 -z-10 mx-4 top-1/2 -translate-y-1/2" />
             <div className="absolute left-4 h-[2px] bg-biblio-green -z-10 top-1/2 -translate-y-1/2 transition-all duration-1000 ease-linear" style={{ width: `calc(${(currentIndex / (readingList.length - 1)) * 100}% - 2rem)` }} />

             {readingList.map((book, idx) => (
               <button key={book.id} onClick={() => { setViewMode('focused'); setCurrentIndex(idx); }} className={`group relative transition-all duration-300 ${idx === currentIndex && viewMode === 'focused' ? 'scale-150' : 'scale-100 hover:scale-125'}`}>
                 <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-colors duration-300 border-2 border-white shadow-sm ${idx <= currentIndex ? 'bg-biblio-green' : 'bg-gray-300'}`} />
               </button>
             ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               {viewMode === 'focused' && (
                   <button onClick={() => setIsPlaying(!isPlaying)} className="flex items-center gap-2 bg-biblio-green text-white px-4 py-2 md:px-6 md:py-3 hover:bg-biblio-green/90 transition-colors font-bold uppercase tracking-wider text-xs md:text-sm shadow-md rounded-sm">
                     {isPlaying ? <Pause size={16} className="md:w-[18px]" /> : <Play size={16} className="md:w-[18px]" />} {isPlaying ? '暂停' : '自动漫游'}
                   </button>
               )}
            </div>
            <div className="flex items-center gap-2">
               {viewMode === 'focused' && (
                   <button onClick={() => setViewMode('overview')} className="px-2 md:px-4 py-3 text-xs font-bold uppercase tracking-widest text-biblio-green hover:bg-biblio-green/10 transition-colors mr-1 md:mr-2">查看全图</button>
               )}
               <button onClick={() => {
                   if (viewMode === 'overview') { setViewMode('focused'); setCurrentIndex(readingList.length - 1); }
                   else if (currentIndex > 0) setCurrentIndex(p => p - 1);
               }} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center border border-biblio-green text-biblio-green bg-white hover:bg-biblio-green hover:text-white transition-colors shadow-sm rounded-sm">
                 <ChevronLeft size={20} className="md:w-6 md:h-6" />
               </button>
               <button onClick={() => {
                   if (viewMode === 'overview') { setViewMode('focused'); setCurrentIndex(0); }
                   else if (currentIndex < readingList.length - 1) setCurrentIndex(p => p + 1);
                   else setViewMode('overview');
               }} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center border border-biblio-green text-biblio-green bg-white hover:bg-biblio-green hover:text-white transition-colors shadow-sm rounded-sm">
                 {viewMode === 'overview' ? <RotateCw size={18} className="md:w-[20px]" /> : <ChevronRight size={20} className="md:w-6 md:h-6" />}
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingMap;