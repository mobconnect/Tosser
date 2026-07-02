import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MapPin, Globe, Loader2, Info, AlertTriangle, Flame, ShieldAlert, Heart, Calendar, Compass, Navigation, Locate, Activity } from 'lucide-react';
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
  status?: string;
  pickedUpAt?: any;
  updatedAt?: any;
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
  const [mapMode, setMapMode] = useState<'hybrid' | 'heatmap' | 'pins'>('hybrid');
  const [userGps, setUserGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const hasFocusedGpsRef = useRef(false);

  const isReportExpired = (report: Report) => {
    if (report.status !== 'Cleaned' && report.status !== 'picked_up') {
      return false;
    }
    const pickupDate = report.pickedUpAt?.toDate 
      ? report.pickedUpAt.toDate() 
      : report.pickedUpAt?.seconds 
        ? new Date(report.pickedUpAt.seconds * 1000) 
        : report.updatedAt?.toDate 
          ? report.updatedAt.toDate() 
          : report.updatedAt?.seconds 
            ? new Date(report.updatedAt.seconds * 1000) 
            : report.createdAt?.toDate
              ? report.createdAt.toDate()
              : report.createdAt?.seconds
                ? new Date(report.createdAt.seconds * 1000)
                : null;
                
    if (!pickupDate) return false;
    const now = new Date();
    const diffTime = now.getTime() - pickupDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays > 7;
  };

  // Helper to compute Haversine distance
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return parseFloat((R * c).toFixed(1));
  };

  const triggerGeolocation = () => {
    setGpsLoading(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserGps(coords);
        setGpsLoading(false);
        hasFocusedGpsRef.current = false; // re-focus on redraw
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setGpsError('Permission denied or timeout. Try a simulated GPS location!');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const simulateLocation = (cityName: string) => {
    const city = CONCENTRATION_CITIES.find(c => c.city.toLowerCase() === cityName.toLowerCase());
    if (city) {
      setUserGps({ lat: city.lat, lng: city.lng });
      setGpsError(null);
      hasFocusedGpsRef.current = false; // re-focus on redraw
    }
  };

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

    // Add custom definitions/gradients for heatmap and user beacon
    const defs = svg.append('defs');

    // Heat gradient (translucent red/orange/yellow core)
    const heatGrad = defs.append('radialGradient')
      .attr('id', 'heat-grad')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');
    heatGrad.append('stop').attr('offset', '0%').attr('stop-color', '#ef4444').attr('stop-opacity', '0.75');
    heatGrad.append('stop').attr('offset', '45%').attr('stop-color', '#f97316').attr('stop-opacity', '0.45');
    heatGrad.append('stop').attr('offset', '75%').attr('stop-color', '#eab308').attr('stop-opacity', '0.2');
    heatGrad.append('stop').attr('offset', '100%').attr('stop-color', '#eab308').attr('stop-opacity', '0.0');

    // User GPS beacon gradient
    const userGrad = defs.append('radialGradient')
      .attr('id', 'user-grad')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');
    userGrad.append('stop').attr('offset', '0%').attr('stop-color', '#3b82f6').attr('stop-opacity', '0.85');
    userGrad.append('stop').attr('offset', '55%').attr('stop-color', '#3b82f6').attr('stop-opacity', '0.3');
    userGrad.append('stop').attr('offset', '100%').attr('stop-color', '#3b82f6').attr('stop-opacity', '0.0');

    // 1. Draw Heatmap Overlay if mapMode is 'heatmap' or 'hybrid'
    if (mapMode === 'heatmap' || mapMode === 'hybrid') {
      const heatmapGroup = mainGroup.append('g').attr('class', 'heatmap-layer');
      
      // Calculate clusters with tighter grouping resolution (e.g. 4.5 degrees)
      const heatClusters: { [key: string]: { lat: number, lng: number, count: number, totalSeverity: number } } = {};
      filteredReports.forEach(r => {
        const lat = r.location?.lat || 0;
        const lng = r.location?.lng || 0;
        const roundLat = Math.round(lat / 4.5) * 4.5;
        const roundLng = Math.round(lng / 4.5) * 4.5;
        const key = `${roundLat},${roundLng}`;
        
        if (!heatClusters[key]) {
          heatClusters[key] = { lat: roundLat, lng: roundLng, count: 0, totalSeverity: 0 };
        }
        heatClusters[key].count += 1;
        heatClusters[key].totalSeverity += r.impactScore;
      });

      Object.values(heatClusters).forEach(c => {
        const coords = projection([c.lng, c.lat]);
        if (!coords) return;
        const [cx, cy] = coords;

        const avgSeverity = c.totalSeverity / c.count;
        // Radius scales with count and severity, and dynamically matches zoom level
        const baseRadius = 15 + (c.count * 8) + (avgSeverity * 2);
        const radius = baseRadius / Math.sqrt(zoomScale);

        // Draw overlapping layered circles to create soft density-mapped glows
        heatmapGroup.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', radius * 1.4)
          .attr('fill', 'url(#heat-grad)')
          .style('mix-blend-mode', 'screen')
          .style('pointer-events', 'none');

        heatmapGroup.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', radius * 0.75)
          .attr('fill', 'url(#heat-grad)')
          .style('mix-blend-mode', 'screen')
          .style('pointer-events', 'none');
      });
    }

    // 2. Draw standard pin locators if pins or hybrid mode is selected
    if (mapMode === 'pins' || mapMode === 'hybrid') {
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
        .attr('fill', d => {
          if (d.status === 'Cleaned' || d.status === 'picked_up') {
            return isReportExpired(d) ? '#52525b' : '#10b981'; // Faded gray for expired, emerald green for active cleaned
          }
          return d.impactScore >= 8 ? '#ef4444' : d.impactScore >= 5 ? '#f59e0b' : '#a3e635';
        })
        .attr('stroke', '#09090b')
        .attr('stroke-width', 1.5 / Math.sqrt(zoomScale))
        .attr('class', d => {
          if (d.status === 'Cleaned' || d.status === 'picked_up') {
            return isReportExpired(d) ? 'glow-gray' : 'glow-green';
          }
          return d.impactScore >= 8 ? 'glow-red' : 'glow-green';
        });

      // Outer radar wave indicator for active threat levels or active cleanups
      pins.filter(d => ((d.status !== 'Cleaned' && d.status !== 'picked_up') && d.impactScore >= 7) || ((d.status === 'Cleaned' || d.status === 'picked_up') && !isReportExpired(d)))
        .append('circle')
        .attr('r', d => 16 / Math.sqrt(zoomScale))
        .attr('fill', 'none')
        .attr('stroke', d => d.status === 'Cleaned' || d.status === 'picked_up' ? '#10b981' : (d.impactScore >= 8 ? '#ef4444' : '#f59e0b'))
        .attr('stroke-width', 0.8)
        .attr('opacity', 0.4)
        .append('animate')
        .attr('attributeName', 'r')
        .attr('values', `1;${24 / Math.sqrt(zoomScale)}`)
        .attr('dur', '2s')
        .attr('repeatCount', 'indefinite');
    }

    // 3. Draw User GPS Beacon if userGps is available
    if (userGps) {
      const coords = projection([userGps.lng, userGps.lat]);
      if (coords) {
        const [ux, uy] = coords;
        const gpsGroup = mainGroup.append('g').attr('class', 'user-gps-beacon');
        
        // Pulsing radar ripple
        gpsGroup.append('circle')
          .attr('cx', ux)
          .attr('cy', uy)
          .attr('r', 25 / Math.sqrt(zoomScale))
          .attr('fill', 'url(#user-grad)')
          .style('pointer-events', 'none')
          .append('animate')
          .attr('attributeName', 'r')
          .attr('values', `5;${30 / Math.sqrt(zoomScale)}`)
          .attr('dur', '2.2s')
          .attr('repeatCount', 'indefinite');

        // Solid inner core
        gpsGroup.append('circle')
          .attr('cx', ux)
          .attr('cy', uy)
          .attr('r', 6 / Math.sqrt(zoomScale))
          .attr('fill', '#3b82f6')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2 / Math.sqrt(zoomScale))
          .style('pointer-events', 'none');

        // Text label
        gpsGroup.append('text')
          .attr('x', ux)
          .attr('y', uy - 12 / Math.sqrt(zoomScale))
          .attr('text-anchor', 'middle')
          .attr('fill', '#3b82f6')
          .attr('font-size', `${9 / Math.sqrt(zoomScale)}px`)
          .attr('font-weight', '900')
          .style('font-family', 'monospace')
          .style('pointer-events', 'none')
          .text('YOU ARE HERE');

        // Transition center to User's GPS once
        if (!hasFocusedGpsRef.current) {
          svg.transition()
            .duration(1000)
            .call(
              zoom.transform,
              d3.zoomIdentity.translate(width / 2 - ux * 2.5, height / 2 - uy * 2.5).scale(2.5)
            );
          hasFocusedGpsRef.current = true;
        }
      }
    }

    // Map reset trigger if clicking background
    svg.on('click', () => {
      setSelectedReport(null);
      svg.transition()
        .duration(500)
        .call(zoom.transform, d3.zoomIdentity);
    });

  }, [geoData, filteredReports, zoomScale, mapMode, userGps]);

  // Helper to focus map on a coordinate programmatically
  const focusOnCoords = (lat: number, lng: number) => {
    if (!svgRef.current || !containerRef.current) return;
    const parent = containerRef.current;
    const width = parent.clientWidth || 900;
    const height = Math.max(width * 0.52, 450);

    const svg = d3.select(svgRef.current);
    const projection = d3.geoMercator()
      .scale(width / 6.2)
      .translate([width / 2, height / 1.55]);

    const coords = projection([lng, lat]);
    if (coords) {
      const [fx, fy] = coords;
      svg.transition()
        .duration(850)
        .call(
          d3.zoom().transform as any,
          d3.zoomIdentity.translate(width / 2 - fx * 2.8, height / 2 - fy * 2.8).scale(2.8)
        );
    }
  };

  // Calculate distances for reports if userGps is available
  const reportsWithDistance = processedReports.map(r => {
    if (!userGps) return { ...r, distance: null as number | null };
    const rLat = r.location?.lat || 0;
    const rLng = r.location?.lng || 0;
    const dist = getDistanceKm(userGps.lat, userGps.lng, rLat, rLng);
    return { ...r, distance: dist };
  });

  // Sort by distance if GPS is available, otherwise sort by impact score or date
  const sortedNearbyReports = [...reportsWithDistance]
    .filter(r => {
      // Must match active filters
      const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            r.location?.address?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategories.includes(r.category);
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return b.impactScore - a.impactScore; // fallback
    });

  return (
    <div className="w-full space-y-6">
      {/* Visual map dashboard controls */}
      <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 bg-zinc-900/30 p-5 rounded-2xl border border-zinc-800/80">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Globe className="text-primary animate-spin-slow" size={20} /> Geospatial Impact Radar
          </h2>
          <p className="text-[11px] text-zinc-500 mt-1 font-medium select-none">D3.js live distribution & clustering of environmental threats.</p>
        </div>

        {/* Map View Mode Controls & Geolocation controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Map Mode Selector */}
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800/60 shrink-0">
            <button
              onClick={() => setMapMode('hybrid')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                mapMode === 'hybrid'
                  ? 'bg-zinc-850 text-white border border-zinc-800/60'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Activity size={12} className="text-primary" />
              Hybrid Radar
            </button>
            <button
              onClick={() => setMapMode('heatmap')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                mapMode === 'heatmap'
                  ? 'bg-zinc-850 text-white border border-zinc-800/60'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Flame size={12} className="text-red-400" />
              Thermal Heatmap
            </button>
            <button
              onClick={() => setMapMode('pins')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                mapMode === 'pins'
                  ? 'bg-zinc-850 text-white border border-zinc-800/60'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <MapPin size={12} className="text-emerald-400" />
              Incident Pinpoints
            </button>
          </div>

          {/* GPS Tracking Button */}
          <button
            onClick={triggerGeolocation}
            disabled={gpsLoading}
            className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 border cursor-pointer ${
              userGps 
                ? 'bg-blue-950/40 text-blue-400 border-blue-800/50' 
                : 'bg-zinc-950 hover:bg-zinc-900 text-zinc-300 border-zinc-800'
            }`}
          >
            {gpsLoading ? (
              <Loader2 className="animate-spin text-blue-400" size={13} />
            ) : (
              <Locate size={13} className={userGps ? "animate-pulse" : ""} />
            )}
            {userGps ? 'GPS Active' : 'Locate Me'}
          </button>

          {/* Search bar */}
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search city, category..."
            className="bg-zinc-950/60 border border-zinc-800 text-xs px-4 py-2.5 rounded-xl text-white outline-none focus:border-primary/50 w-full sm:w-44 placeholder-zinc-600 transition-all inline-block"
          />
        </div>
      </div>

      {/* Geolocation Feedback & Simulations (Under controls) */}
      {gpsError && (
        <div className="bg-amber-950/20 border border-amber-900/40 text-amber-400 px-4 py-3 rounded-xl text-[11px] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Info size={14} className="shrink-0 animate-pulse" />
            <span>{gpsError}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <span className="text-[9px] text-zinc-500 uppercase font-mono font-bold mr-1">Simulate GPS:</span>
            {['London', 'New York', 'Sydney', 'Cape Town'].map((city) => (
              <button
                key={city}
                onClick={() => simulateLocation(city)}
                className="px-2 py-1 bg-zinc-950 hover:bg-zinc-900 text-[9px] font-bold text-zinc-400 hover:text-white rounded-lg border border-zinc-850 transition-all cursor-pointer"
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* If GPS is connected but no error, let users easily mock other locations to test clusters */}
      {userGps && !gpsError && (
        <div className="bg-blue-950/15 border border-blue-900/20 text-blue-300 px-4 py-2.5 rounded-xl text-[11px] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Compass size={14} className="text-blue-400 animate-spin-slow" />
            <span>Position Active: <strong className="font-mono font-black text-white">{userGps.lat.toFixed(4)}°N, {userGps.lng.toFixed(4)}°E</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-blue-500 uppercase font-mono font-bold mr-1">Switch simulated center:</span>
            {['London', 'New York', 'Sydney', 'Cape Town', 'Tokyo'].map((city) => (
              <button
                key={city}
                onClick={() => simulateLocation(city)}
                className="px-2 py-0.5 bg-blue-950/60 hover:bg-blue-900/60 text-[9px] font-bold text-blue-400 hover:text-white rounded-md border border-blue-900/50 transition-all cursor-pointer"
              >
                {city}
              </button>
            ))}
            <button
              onClick={() => { setUserGps(null); hasFocusedGpsRef.current = false; }}
              className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-[9px] font-bold text-zinc-400 hover:text-zinc-200 rounded-md border border-zinc-800 transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

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
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-zinc-800 shrink-0">
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
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-tight leading-snug">{selectedReport.title}</h3>
                      <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-bold uppercase tracking-wider mt-1 select-none">
                        <MapPin size={10} className="text-primary" />
                        <span className="truncate">{selectedReport.location?.address}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="px-2 py-1 bg-zinc-950 hover:bg-zinc-900 text-[8px] font-black text-zinc-500 hover:text-white uppercase rounded border border-zinc-850 cursor-pointer shrink-0 transition-all"
                    >
                      Close
                    </button>
                  </div>

                  <p className="text-zinc-400 text-xs leading-relaxed">{selectedReport.description}</p>

                  <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80 space-y-2">
                    <p className="text-[9px] font-bold uppercase text-zinc-500 tracking-wider flex items-center gap-1">
                      <ShieldAlert size={11} className="text-primary" /> Impact Insights
                    </p>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">{selectedReport.educationalTip}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between shrink-0">
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
                className="space-y-4 flex flex-col h-full"
              >
                <div className="border-b border-zinc-900 pb-3 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Compass size={14} className="text-primary animate-pulse" />
                      Nearest Clusters
                    </h3>
                    <p className="text-[9px] text-zinc-500 font-mono uppercase mt-0.5">Focus litter clusters by distance</p>
                  </div>
                  {!userGps && (
                    <span className="text-[8px] bg-zinc-950 text-zinc-500 border border-zinc-850 px-2 py-0.5 rounded-md font-mono font-bold select-none">
                      GPS SYNC REQ
                    </span>
                  )}
                </div>

                {/* If GPS is not connected, display a nice prompt and quick simulation controls */}
                {!userGps ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8">
                    <div className="w-12 h-12 bg-zinc-950 border border-zinc-850 rounded-full flex items-center justify-center text-zinc-600 shadow-inner">
                      <Navigation size={22} className="text-zinc-500 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-zinc-300 text-xs font-bold uppercase tracking-wider">Sync Location</h4>
                      <p className="text-zinc-500 text-[10px] px-2 mt-1.5 leading-relaxed">
                        Authorize GPS or select a major city below to calculate distances and track active local waste clusters.
                      </p>
                    </div>

                    <button
                      onClick={triggerGeolocation}
                      className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold uppercase rounded-xl border border-primary/20 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Locate size={11} />
                      Sync GPS coordinates
                    </button>

                    <div className="space-y-2 w-full pt-2">
                      <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">Select simulated location:</p>
                      <div className="grid grid-cols-2 gap-1.5 px-2">
                        {['London', 'New York', 'Sydney', 'Cape Town'].map((city) => (
                          <button
                            key={city}
                            onClick={() => simulateLocation(city)}
                            className="p-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 rounded-xl text-[10px] text-zinc-400 hover:text-white font-bold uppercase transition-all truncate cursor-pointer"
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  // If GPS is synced, show closest sorted reports
                  <div className="flex-1 flex flex-col justify-between overflow-hidden">
                    <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1 flex-1">
                      {sortedNearbyReports.length === 0 ? (
                        <p className="text-xs text-zinc-500 text-center py-12 italic">No sightings match active filters.</p>
                      ) : (
                        sortedNearbyReports.map((report) => {
                          const catColor = CATEGORIES.find(c => c.id === report.category)?.color || '#a3e635';
                          return (
                            <div 
                              key={report.id}
                              className="bg-zinc-950/50 hover:bg-zinc-950 border border-zinc-900 hover:border-zinc-800/80 p-3 rounded-2xl transition-all cursor-pointer group flex items-start gap-3"
                              onClick={() => {
                                setSelectedReport(report);
                                // focus coordinates in D3
                                hasFocusedGpsRef.current = true; // prevent default gps center overrides
                                focusOnCoords(report.location?.lat || 0, report.location?.lng || 0);
                              }}
                            >
                              <div className="w-10 h-10 rounded-xl overflow-hidden border border-zinc-850 shrink-0">
                                <img src={report.imageUrl} alt={report.title} className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: `${catColor}15`, color: catColor }}>
                                    {report.category.replace('_', ' ')}
                                  </span>
                                  {report.distance !== null && (
                                    <span className="text-[9px] font-mono font-bold text-zinc-500 shrink-0">
                                      {report.distance.toLocaleString()} km
                                    </span>
                                  )}
                                </div>
                                <h5 className="text-white text-xs font-bold truncate mt-1 group-hover:text-primary transition-colors">{report.title}</h5>
                                <div className="flex items-center gap-1 text-[8px] text-zinc-600 uppercase font-mono mt-0.5">
                                  <span>Severity:</span>
                                  <span className={`font-black ${report.impactScore >= 8 ? 'text-red-400' : report.impactScore >= 5 ? 'text-amber-400' : 'text-primary'}`}>
                                    {report.impactScore}/10
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="pt-3 border-t border-zinc-900 text-center shrink-0">
                      <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider">
                        Found {sortedNearbyReports.length} threat clusters nearby
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
