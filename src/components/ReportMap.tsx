import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MapPin, Globe, Loader2, Info, AlertTriangle, Flame, ShieldAlert, Heart, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { shareReport } from '../lib/api';

interface Report {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  impactScore: number;
  educationalTip: string;
  userName: string;
  createdAt: any;
  likeCount?: number;
  dislikeCount?: number;
  location?: {
    lat?: number;
    lng?: number;
    address?: string;
  };
}

interface ReportMapProps {
  reports: Report[];
}

// Major cities for fallback dispersion if coordinates are [0,0] or undefined
const CONCENTRATION_CITIES = [
  { city: 'New York', lat: 40.7128, lng: -74.0060, count: 0 },
  { city: 'London', lat: 51.5074, lng: -0.1278, count: 0 },
  { city: 'Tokyo', lat: 35.6762, lng: 139.6503, count: 0 },
  { city: 'Sydney', lat: -33.8688, lng: 151.2093, count: 0 },
  { city: 'Cape Town', lat: -33.9249, lng: 18.4241, count: 0 },
  { city: 'Cairo', lat: 30.0444, lng: 31.2357, count: 0 },
  { city: 'Sao Paulo', lat: -23.5505, lng: -46.6333, count: 0 },
  { city: 'Nairobi', lat: -1.2921, lng: 36.8219, count: 0 },
  { city: 'San Francisco', lat: 37.7749, lng: -122.4194, count: 0 },
  { city: 'Paris', lat: 48.8566, lng: 2.3522, count: 0 },
  { city: 'Mumbai', lat: 19.0760, lng: 72.8777, count: 0 },
  { city: 'Reykjavik', lat: 64.1466, lng: -21.9426, count: 0 }
];

const CATEGORIES = [
  { id: 'litter', name: 'Litter', color: '#10b981' },
  { id: 'illegal_dumping', name: 'Illegal Dumping', color: '#ef4444' },
  { id: 'pollution', name: 'Pollution', color: '#f59e0b' },
  { id: 'vandalism', name: 'Vandalism', color: '#3b82f6' },
  { id: 'other', name: 'Other', color: '#8b5cf6' }
];

export const ReportMap: React.FC<ReportMapProps> = ({ reports }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [loadingMap, setLoadingMap] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [hoveredReport, setHoveredReport] = useState<Report | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(CATEGORIES.map(c => c.id));

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(catId)) {
        return prev.filter(c => c !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  const selectAllCategories = () => {
    setSelectedCategories(CATEGORIES.map(c => c.id));
  };

  const clearAllCategories = () => {
    setSelectedCategories([]);
  };

  // Assign deterministic dynamic locations to reports that lack real ones or are locked to [0,0]
  const processedReports = reports.map((report, idx) => {
    let lat = report.location?.lat;
    let lng = report.location?.lng;
    
    // Check if location is absent, uninitialized, or equivalent to 0
    if (lat === undefined || lng === undefined || (lat === 0 && lng === 0)) {
      // Use index to pick a deterministic city
      const cityData = CONCENTRATION_CITIES[idx % CONCENTRATION_CITIES.length];
      
      // Inject slight jitter based on report ID so they aren't exactly on top of each other
      const idCode = report.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const jitterLat = ((idCode % 7) - 3) * 0.4;
      const jitterLng = ((idCode % 13) - 6) * 0.4;
      
      return {
        ...report,
        location: {
          lat: cityData.lat + jitterLat,
          lng: cityData.lng + jitterLng,
          address: `${cityData.city} (Geo-Assigned)`
        }
      };
    }
    return report;
  });

  // Filtered reports
  const filteredReports = processedReports.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.location?.address?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategories.includes(r.category);
    return matchesSearch && matchesCategory;
  });

  // Load World Map GeoJSON
  useEffect(() => {
    let active = true;
    const fetchGeoMap = async () => {
      try {
        const res = await fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson');
        if (!res.ok) throw new Error('Network map load failed');
        const data = await res.json();
        if (active) {
          setGeoData(data);
          setLoadingMap(false);
        }
      } catch (err) {
        console.warn('Fallback to grid radar map projection: ', err);
        if (active) {
          setLoadingMap(false);
        }
      }
    };
    fetchGeoMap();
    return () => {
      active = false;
    };
  }, []);

  // Set up the interactive D3 map
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Clear previous drawing
    d3.select(svgRef.current).selectAll('*').remove();

    const parent = containerRef.current;
    const width = parent.clientWidth || 900;
    const height = Math.max(width * 0.52, 450);

    const svg = d3.select(svgRef.current)
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Create container group for zoom and pan
    const mainGroup = svg.append('g').attr('class', 'map-viewport');

    // Projection setup - Natural Earth looks stunning and fits the global vibe
    const projection = d3.geoMercator()
      .scale(width / 6.2)
      .translate([width / 2, height / 1.55]);

    const pathGenerator = d3.geoPath().projection(projection);

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        mainGroup.attr('transform', event.transform);
        setZoomScale(event.transform.k);
      });

    svg.call(zoom);

    // Grid lines for high-tech geospatial aesthetic
    const graticule = d3.geoGraticule();
    mainGroup.append('path')
      .datum(graticule)
      .attr('class', 'graticule')
      .attr('d', pathGenerator as any)
      .attr('fill', 'none')
      .attr('stroke', '#27272a') // zinc-800
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.3);

    if (geoData) {
      // 1. Render actual continents
      mainGroup.append('g')
        .attr('class', 'countries')
        .selectAll('path')
        .data(geoData.features)
        .enter()
        .append('path')
        .attr('d', pathGenerator as any)
        .attr('fill', '#09090b') // zinc-950
        .attr('stroke', '#18181b') // zinc-900 border
        .attr('stroke-width', 0.6)
        .attr('vector-effect', 'non-scaling-stroke')
        .on('mouseover', function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('fill', '#18181b') // lighter background accent on hover
            .attr('stroke', '#27272a');
        })
        .on('mouseout', function () {
          d3.select(this)
            .transition()
            .duration(300)
            .attr('fill', '#09090b')
            .attr('stroke', '#18181b');
        });
    } else {
      // 2. Render beautiful futuristic outline grids if loading map failed
      // Generates a mock grid indicating the globe
      const dotsData: Array<{lat: number, lng: number}> = [];
      for (let lat = -60; lat <= 70; lat += 8) {
        for (let lng = -180; lng <= 180; lng += 8) {
          // Exclude poles and some non-land patterns for simple pseudo-globe shape
          const absLat = Math.abs(lat);
          const absLng = Math.abs(lng);
          if (absLat < 75 && !(absLat > 35 && absLng > 45 && absLng < 75 && lat < 0)) {
            dotsData.push({ lat, lng });
          }
        }
      }

      mainGroup.append('g')
        .attr('class', 'grid-fallback')
        .selectAll('circle')
        .data(dotsData)
        .enter()
        .append('circle')
        .attr('cx', d => projection([d.lng, d.lat])?.[0] || 0)
        .attr('cy', d => projection([d.lng, d.lat])?.[1] || 0)
        .attr('r', 1.2)
        .attr('fill', '#27272a') // zinc-800 dots
        .attr('opacity', 0.25);
    }

    // Concentrated areas Heat/Density mapping
    // Group processed reports to find overlapping ranges (density)
    const clusters: { [key: string]: { lat: number, lng: number, count: number, maxSeverity: number } } = {};
    filteredReports.forEach(r => {
      const lat = r.location?.lat || 0;
      const lng = r.location?.lng || 0;
      // Group by roughly 5 degrees of resolution for density indicators
      const roundLat = Math.round(lat / 6) * 6;
      const roundLng = Math.round(lng / 6) * 6;
      const key = `${roundLat},${roundLng}`;
      
      if (!clusters[key]) {
        clusters[key] = { lat: roundLat, lng: roundLng, count: 0, maxSeverity: 0 };
      }
      clusters[key].count += 1;
      clusters[key].maxSeverity = Math.max(clusters[key].maxSeverity, r.impactScore);
    });

    // 3. Draw glow density circles under the spots
    const densityGroup = mainGroup.append('g').attr('class', 'density-zones');
    Object.values(clusters).forEach(cluster => {
      const coords = projection([cluster.lng, cluster.lat]);
      if (!coords) return;
      const [cx, cy] = coords;

      if (cluster.count > 1) {
        // Multi-incident glowing zone
        densityGroup.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 12 + cluster.count * 4)
          .attr('fill', cluster.maxSeverity >= 8 ? '#ef4444' : cluster.maxSeverity >= 5 ? '#f59e0b' : '#a3e635')
          .attr('opacity', 0.12)
          .attr('class', 'animate-pulse')
          .style('mix-blend-mode', 'screen')
          .style('pointer-events', 'none');
      }
    });

    // 4. Draw detailed pin locators
    const pinsGroup = mainGroup.append('g').attr('class', 'incident-pins');
    
    // Create pins
    const pins = pinsGroup.selectAll('.pin-group')
      .data(filteredReports)
      .enter()
      .append('g')
      .attr('class', 'pin-group')
      .attr('transform', d => {
        const coords = projection([d.location?.lng || 0, d.location?.lat || 0]);
        return coords ? `translate(${coords[0]}, ${coords[1]})` : 'translate(0,0)';
      })
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        setHoveredReport(d);
      })
      .on('mouseleave', () => {
        setHoveredReport(null);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedReport(d);
        // Animated transition focus (center map around coordinates)
        const coords = projection([d.location?.lng || 0, d.location?.lat || 0]);
        if (coords) {
          const focusedX = coords[0];
          const focusedY = coords[1];
          svg.transition()
            .duration(750)
            .call(
              zoom.transform,
              d3.zoomIdentity.translate(width / 2 - focusedX * 2.5, height / 2 - focusedY * 2.5).scale(2.5)
            );
        }
      });

    // Draw the actual glow core
    pins.append('circle')
      .attr('r', d => 5 / Math.sqrt(zoomScale))
      .attr('fill', d => d.impactScore >= 8 ? '#ef4444' : d.impactScore >= 5 ? '#f59e0b' : '#a3e635')
      .attr('stroke', '#09090b')
      .attr('stroke-width', 1.5 / Math.sqrt(zoomScale))
      .attr('class', d => d.impactScore >= 8 ? 'glow-red' : 'glow-green');

    // Outer radar wave indicator for heavy severity reports
    pins.filter(d => d.impactScore >= 7)
      .append('circle')
      .attr('r', d => 16 / Math.sqrt(zoomScale))
      .attr('fill', 'none')
      .attr('stroke', d => d.impactScore >= 8 ? '#ef4444' : '#f59e0b')
      .attr('stroke-width', 0.8)
      .attr('opacity', 0.4)
      .append('animate')
      .attr('attributeName', 'r')
      .attr('values', `1;${24 / Math.sqrt(zoomScale)}`)
      .attr('dur', '2s')
      .attr('repeatCount', 'indefinity');

    // Map reset trigger if clicking background
    svg.on('click', () => {
      setSelectedReport(null);
      svg.transition()
        .duration(500)
        .call(zoom.transform, d3.zoomIdentity);
    });

  }, [geoData, filteredReports, zoomScale]);

  return (
    <div className="w-full space-y-6">
      {/* Visual map dashboard controls */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-zinc-900/30 p-5 rounded-2xl border border-zinc-800/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Globe className="text-primary animate-spin-slow" size={20} /> Geospatial Impact Radar
          </h2>
          <p className="text-[11px] text-zinc-500 mt-1 font-medium select-none">D3.js live distribution & clustering of environmental threats.</p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search city, category..."
            className="bg-zinc-950/60 border border-zinc-800 text-xs px-4 py-2.5 rounded-xl text-white outline-none focus:border-primary/50 w-full sm:w-48 placeholder-zinc-600 transition-all inline-block"
          />
        </div>
      </div>

      {/* Interactive Sighting Legend Component */}
      <div className="bg-zinc-900/20 border border-zinc-800/80 p-5 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none select-none">Interactive threat category toggle</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={selectAllCategories}
              className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-900 text-[9px] text-zinc-500 hover:text-white font-bold uppercase rounded-lg border border-zinc-800 transition-all cursor-pointer"
            >
              Check All
            </button>
            <button
              onClick={clearAllCategories}
              className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-900 text-[9px] text-zinc-500 hover:text-white font-bold uppercase rounded-lg border border-zinc-800 transition-all cursor-pointer"
            >
              Clear All
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {CATEGORIES.map((cat) => {
            const isChecked = selectedCategories.includes(cat.id);
            return (
              <label 
                key={cat.id} 
                className={`flex items-center gap-3 bg-zinc-950/40 hover:bg-zinc-900/60 border p-3 rounded-xl cursor-pointer select-none transition-all active:scale-98 ${
                  isChecked ? 'border-zinc-800' : 'border-zinc-900 opacity-40'
                }`}
              >
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCategory(cat.id)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    isChecked 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-zinc-800 bg-zinc-950 text-transparent'
                  }`}>
                    {isChecked && (
                      <svg className="w-3.5 h-3.5 stroke-[3] stroke-current fill-none" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">{cat.name.replace('_', ' ')}</span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Dynamic map viewport panel */}
        <div className="lg:col-span-3 bg-zinc-900/20 border border-zinc-800/80 rounded-3xl p-4 overflow-hidden relative min-h-[450px]" ref={containerRef}>
          {loadingMap && (
            <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-40">
              <Loader2 className="animate-spin text-primary" size={32} />
              <p className="text-xs uppercase font-bold tracking-widest text-zinc-500">Projecting GeoData Map...</p>
            </div>
          )}

          {/* D3 Map SVG Mount */}
          <svg ref={svgRef} className="w-full h-full block bg-zinc-950/40 select-none"></svg>

          {/* Overlay Map Help Hints */}
          <div className="absolute bottom-4 left-4 p-3 bg-zinc-950/80 backdrop-blur-md rounded-xl border border-zinc-800/80 flex items-center gap-3 text-[10px] text-zinc-500 font-bold uppercase tracking-wider pointer-events-none select-none">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-pulse"></span> Severe (Impact &gt;= 8)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Medium (Impact 5-7)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span> Low</span>
          </div>

          <div className="absolute top-4 right-4 p-2 bg-zinc-950/80 backdrop-blur-md rounded-xl border border-zinc-800/80 text-[9px] text-zinc-500 font-bold select-none pointer-events-none">
            Scale: {zoomScale.toFixed(1)}x (Scroll to zoom, drag to pan)
          </div>

          {/* Dynamic Pin Hover Tooltip (Mouse Tracker) */}
          <AnimatePresence>
            {hoveredReport && !selectedReport && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-4 left-4 z-30 max-w-xs bg-zinc-950/95 backdrop-blur-md p-4 rounded-2xl border border-zinc-800/80 shadow-2xl pointer-events-none"
              >
                <div className="flex gap-2 items-center mb-2">
                  <span className="text-[8px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-md border border-primary/20">
                    {hoveredReport.category}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-semibold">{hoveredReport.location?.address}</span>
                </div>
                <h4 className="text-white font-bold text-sm leading-tight">{hoveredReport.title}</h4>
                <p className="text-[10px] text-zinc-400 mt-1 uppercase font-bold flex items-center gap-1">
                  Impact Score: <span className="text-red-500">{hoveredReport.impactScore}/10</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Selected Report Inspect view panel */}
        <div className="bg-zinc-900/10 border border-zinc-800/80 rounded-3xl p-6 min-h-[350px] flex flex-col justify-between">
          <AnimatePresence mode="wait">
            {selectedReport ? (
              <motion.div
                key={selectedReport.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 flex flex-col h-full"
              >
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-zinc-800">
                  <img src={selectedReport.imageUrl} alt={selectedReport.title} className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur-md text-[9px] font-bold border border-white/10 px-2 py-1 text-primary rounded-md uppercase">
                    {selectedReport.category}
                  </div>
                  <div className="absolute top-3 right-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-black text-xs ${
                      selectedReport.impactScore >= 8 ? 'bg-red-500' : selectedReport.impactScore >= 5 ? 'bg-amber-500' : 'bg-primary'
                    }`}>
                      {selectedReport.impactScore}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight leading-snug">{selectedReport.title}</h3>
                    <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-1 select-none">
                      <MapPin size={10} className="text-primary" />
                      <span className="truncate">{selectedReport.location?.address}</span>
                    </div>
                  </div>

                  <p className="text-zinc-400 text-xs leading-relaxed">{selectedReport.description}</p>

                  <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80 space-y-2">
                    <p className="text-[9px] font-bold uppercase text-zinc-500 tracking-wider flex items-center gap-1">
                      <ShieldAlert size={11} className="text-primary" /> Impact Insights
                    </p>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">{selectedReport.educationalTip}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">BY {selectedReport.userName?.split(' ')[0] || 'Member'}</span>
                  <button 
                    onClick={() => shareReport(selectedReport)}
                    className="text-xs px-3 py-1.5 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/80 rounded-xl font-bold uppercase tracking-wide transition-all cursor-pointer text-zinc-300"
                  >
                    Share
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-center space-y-4 py-16"
              >
                <div className="w-14 h-14 bg-zinc-850/50 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-600">
                  <MapPin size={28} />
                </div>
                <div>
                  <h4 className="text-zinc-300 text-sm font-bold uppercase tracking-wider">No Pin Selected</h4>
                  <p className="text-zinc-500 text-xs px-4 mt-2 leading-relaxed italic">
                    Tap any incident coordinate on the interactive radar map to examine details, images, and planetary insights.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
