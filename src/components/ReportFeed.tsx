import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Info, AlertTriangle, ArrowRight, RotateCcw, LayoutGrid, Share2, Plus, X, Camera, Globe, CheckCircle2, Search, Compass, Filter } from 'lucide-react';
import { cn } from '../lib/utils';
import { SwipeCard } from './SwipeCard';
import { ReportForm } from './ReportForm';
import { ReportMap } from './ReportMap';
import { ReportDetailModal } from './ReportDetailModal';
import { swipeReport, shareReport } from '../lib/api';
import { useLanguage } from './LanguageContext';

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
  status?: string;
  proofImageUrl?: string;
  resolverId?: string;
  resolverName?: string;
  userId?: string;
  pickedUpAt?: any;
  updatedAt?: any;
}

export const ReportFeed: React.FC<{ reports: Report[]; loading?: boolean }> = ({ reports, loading = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'swipe' | 'grid' | 'map'>('swipe');
  const [showReportForm, setShowReportForm] = useState(false);
  const [lastSwipe, setLastSwipe] = useState<'like' | 'dislike' | null>(null);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [showExpired, setShowExpired] = useState(false);
  const { t } = useLanguage();

  // Search, Category and Geolocational Distance Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [distanceRadius, setDistanceRadius] = useState<number | 'All'>('All');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Haversine formula to compute distance in km
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleDetectUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocating(false);
        setDistanceRadius(15); // Friendly local default (15km)
      },
      (error) => {
        console.warn("User geolocation error: ", error);
        setLocationError("Permission denied or location unavailable.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setDistanceRadius('All');
  };

  React.useEffect(() => {
    if (reports && reports.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const reportId = params.get('reportId');
      if (reportId) {
        const found = reports.find(r => r.id === reportId);
        if (found) {
          setSelectedReport(found);
        }
      }
    }
  }, [reports]);

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

  const activeReports = reports.filter(r => !isReportExpired(r) || showExpired);

  const filteredReports = activeReports.filter(report => {
    const matchesSearch = 
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.location?.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.category || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = 
      selectedCategory === 'All' || 
      (report.category || '').toLowerCase().includes(selectedCategory.toLowerCase());

    let matchesDistance = true;
    if (distanceRadius !== 'All' && userLocation && report.location?.lat && report.location?.lng) {
      const distance = getDistanceKm(
        userLocation.lat,
        userLocation.lng,
        report.location.lat,
        report.location.lng
      );
      matchesDistance = distance <= distanceRadius;
    }

    return matchesSearch && matchesCategory && matchesDistance;
  });

  const handleSwipe = async (type: 'like' | 'dislike') => {
    const report = filteredReports[currentIndex];
    if (report) {
      setLastSwipe(type);
      await swipeReport(report.id, type);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const isFinished = currentIndex >= filteredReports.length;

  if (loading) {
    return (
      <div className="space-y-8 select-none">
        {/* Skeleton controls header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-6 gap-4">
          <div className="space-y-3">
            <div className="h-6 w-32 bg-zinc-800 rounded-lg animate-pulse"></div>
            <div className="h-3.5 w-60 bg-zinc-900 rounded animate-pulse"></div>
          </div>
          <div className="h-12 w-48 bg-zinc-900 rounded-xl animate-pulse"></div>
        </div>

        {viewMode === 'swipe' ? (
          <div className="max-w-md mx-auto h-[610px] border border-zinc-900 bg-zinc-950/20 rounded-3xl p-7 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="aspect-[4/3] bg-zinc-900 rounded-2xl relative overflow-hidden animate-pulse"></div>
              <div className="space-y-3">
                <div className="h-5 w-2/3 bg-zinc-900 rounded animate-pulse"></div>
                <div className="h-3 w-1/2 bg-zinc-900 rounded animate-pulse"></div>
              </div>
              <div className="h-16 w-full bg-zinc-900/60 rounded-xl animate-pulse"></div>
            </div>
            <div className="flex justify-center gap-8">
              <div className="w-16 h-16 rounded-full bg-zinc-900 animate-pulse"></div>
              <div className="w-16 h-16 rounded-full bg-zinc-900 animate-pulse"></div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
            {[1, 2, 3].map((key) => (
              <div key={key} className="bg-zinc-900/30 rounded-2xl border border-zinc-900 overflow-hidden h-full flex flex-col space-y-4 p-6">
                <div className="aspect-[4/3] bg-zinc-900 rounded-xl relative overflow-hidden animate-pulse"></div>
                <div className="space-y-3">
                  <div className="h-5 w-3/4 bg-zinc-900 rounded animate-pulse"></div>
                  <div className="h-3 w-1/3 bg-zinc-900 rounded animate-pulse"></div>
                </div>
                <div className="h-20 w-full bg-zinc-900/60 rounded-xl animate-pulse"></div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (activeReports.length === 0 && !showReportForm) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-500 gap-4">
        <AlertTriangle size={32} className="text-primary/50 mb-2" />
        <p className="text-lg font-bold text-white">No Active Incidents Logged</p>
        <p className="text-sm">
          {reports.length > 0 ? "All logged sightings are either resolved or older than 7 days." : "Be the first to report environmental neglect"}
        </p>
        <div className="flex gap-4 mt-6">
          {reports.length > 0 && !showExpired && (
            <button 
              onClick={() => setShowExpired(true)}
              className="py-3 px-6 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-850 transition-all cursor-pointer"
            >
              Show Expired Cleanups
            </button>
          )}
          <button 
            onClick={() => setShowReportForm(true)}
            className="py-3 px-8 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all cursor-pointer"
          >
            {reports.length > 0 ? "Report New Sighting" : "Dispatch First Report"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      {/* Floating Action Button for Report */}
      {!showReportForm && (
        <button 
          onClick={() => setShowReportForm(true)}
          className="fixed bottom-24 right-8 z-50 w-16 h-16 bg-primary text-black flex items-center justify-center rounded-full shadow-2xl hover:scale-115 active:scale-95 transition-all cursor-pointer"
        >
          <Camera size={28} />
        </button>
      )}

      {showReportForm && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900 border border-zinc-800 p-8 md:p-12 rounded-3xl shadow-3xl relative"
        >
          <button 
            onClick={() => setShowReportForm(false)}
            className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white uppercase">{t('reportLitter')}</h2>
            <p className="text-sm text-zinc-500 mt-2">Log the violation. Impact the stats.</p>
          </div>
          <ReportForm onSuccess={() => setShowReportForm(false)} />
        </motion.div>
      )}

      {/* Feed Mode Segmented Controls */}
      {!showReportForm && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-6 gap-4 select-none">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white uppercase">
              {viewMode === 'swipe' ? t('swipeTitle') : viewMode === 'grid' ? 'Archive Feed' : 'Geographic Radar'}
            </h2>
            <p className="text-xs text-zinc-500 mt-1 font-medium select-none">
              {viewMode === 'swipe' ? 'Verify logged reports of local environmental neglect.' : viewMode === 'grid' ? 'Browse the list of logged environmental data.' : 'Visual clustering of planetary impact scores.'}
            </p>
          </div>
          
          <div className="flex bg-zinc-900/60 border border-zinc-800/80 p-1.5 rounded-2xl gap-1.5 self-start sm:self-center">
            {[
              { id: 'swipe', icon: <RotateCcw size={13} />, label: 'SWIPE CORE' },
              { id: 'grid', icon: <LayoutGrid size={13} />, label: 'GRID FEED' },
              { id: 'map', icon: <Globe size={13} />, label: 'IMPACT RADAR' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as any)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer",
                  viewMode === mode.id 
                    ? "bg-primary text-black font-extrabold shadow-md" 
                    : "text-zinc-500 hover:text-white"
                )}
              >
                {mode.icon}
                <span>{mode.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Search & Geolocational Filtering Panel */}
      {!showReportForm && viewMode !== 'map' && (
        <div className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-3xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input Bar */}
            <div className="relative md:col-span-5">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500 pointer-events-none">
                <Search size={15} />
              </span>
              <input
                type="text"
                placeholder="Search description, titles, or coordinates..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentIndex(0); // Reset swipe index
                }}
                className="w-full bg-zinc-950/80 border border-zinc-800/50 focus:border-primary/50 text-white rounded-2xl pl-11 pr-4 py-3.5 text-xs outline-none transition-all placeholder:text-zinc-600 font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => { setSearchTerm(''); setCurrentIndex(0); }}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Filter Selector */}
            <div className="relative md:col-span-3">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500 pointer-events-none">
                <Filter size={14} />
              </span>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentIndex(0); // Reset swipe index
                }}
                className="w-full bg-zinc-950/80 border border-zinc-800/50 focus:border-primary/50 text-zinc-300 rounded-2xl pl-11 pr-4 py-3.5 text-xs outline-none transition-all cursor-pointer appearance-none font-bold uppercase tracking-wider"
              >
                <option value="All">All Categories</option>
                <option value="Plastic">Plastic / Bottles</option>
                <option value="Chemical">Chemical / Sewage</option>
                <option value="Dumping">Fly-Tipping / Dumping</option>
                <option value="Litter">Litter / General</option>
              </select>
            </div>

            {/* Distance Filter Selector */}
            <div className="relative md:col-span-4 flex gap-2">
              {userLocation ? (
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500 pointer-events-none">
                    <Compass size={14} className="text-primary animate-pulse" />
                  </span>
                  <select
                    value={distanceRadius}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDistanceRadius(val === 'All' ? 'All' : Number(val));
                      setCurrentIndex(0); // Reset swipe index
                    }}
                    className="w-full bg-zinc-950/80 border border-zinc-800/50 focus:border-primary/50 text-zinc-300 rounded-2xl pl-11 pr-4 py-3.5 text-xs outline-none transition-all cursor-pointer appearance-none font-bold uppercase tracking-wider"
                  >
                    <option value="All">All Distances</option>
                    <option value="5">Within 5 km</option>
                    <option value="15">Within 15 km</option>
                    <option value="30">Within 30 km</option>
                    <option value="100">Within 100 km</option>
                  </select>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleDetectUserLocation}
                  disabled={locating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-950/60 hover:bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-2xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 select-none"
                >
                  <Compass size={14} className={cn("text-primary", locating && "animate-spin")} />
                  <span>{locating ? "Locating..." : "Enable Near Me"}</span>
                </button>
              )}

              {/* Reset shortcut */}
              {(searchTerm || selectedCategory !== 'All' || distanceRadius !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    resetFilters();
                    setCurrentIndex(0);
                  }}
                  className="px-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/50 hover:border-zinc-700 text-zinc-500 hover:text-primary rounded-2xl transition-all cursor-pointer"
                  title="Reset Filter Form"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Active Geolocation Coordinates Status */}
          {userLocation && (
            <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono px-1">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Active GPS Anchorage: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setUserLocation(null);
                  setDistanceRadius('All');
                  setCurrentIndex(0);
                }}
                className="hover:text-rose-400 underline transition-colors font-bold cursor-pointer"
              >
                Disable GPS
              </button>
            </div>
          )}

          {locationError && (
            <p className="text-[9px] text-rose-400/80 font-mono px-1">
              ⚠️ {locationError} Please allow locations.
            </p>
          )}
        </div>
      )}

      {/* Expiry / Active count banner */}
      {!showReportForm && viewMode !== 'map' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-zinc-900/40 p-5 rounded-2xl border border-zinc-800/80 gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">
                Showing {filteredReports.length} Sighting{filteredReports.length === 1 ? '' : 's'} (out of {activeReports.length} total active)
              </p>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase tracking-wider">
                Resolved incidents older than 7 days automatically archive.
              </p>
            </div>
          </div>
          {reports.some(isReportExpired) && (
            <button
              onClick={() => {
                setShowExpired(!showExpired);
                setCurrentIndex(0); // Reset swipe index
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer select-none",
                showExpired 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15" 
                  : "bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800"
              )}
            >
              {showExpired ? "Hide Archived Cleanups" : "Show Archived Cleanups"}
            </button>
          )}
        </div>
      )}

      {/* Swipe Core Feed View */}
      {viewMode === 'swipe' && !showReportForm && (
        <div className="max-w-md mx-auto h-[640px] relative flex flex-col items-center justify-center">
          {filteredReports.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-4 bg-zinc-900/40 border border-zinc-850 p-10 rounded-3xl"
            >
              <Search size={32} className="mx-auto text-zinc-600" />
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">No Match Found</h3>
              <p className="text-xs text-zinc-500">No reports matched your search, category or geolocational criteria.</p>
              <button
                onClick={resetFilters}
                className="py-2.5 px-5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Clear Filters
              </button>
            </motion.div>
          ) : (
            <AnimatePresence>
              {isFinished ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-6 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 p-10 rounded-2xl"
                >
                  <RotateCcw size={40} className="mx-auto text-primary/60 animate-spin-slow" />
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">Scanning Complete</h3>
                    <p className="text-sm text-zinc-500 mt-1">You've inspected all filtered reports</p>
                  </div>
                  <button 
                    onClick={() => setCurrentIndex(0)}
                    className="w-full py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/95 transition-all cursor-pointer"
                  >
                    Reset Feed
                  </button>
                </motion.div>
              ) : (
                <div className="w-full h-full relative">
                  {/* Stack Background Cards */}
                  {filteredReports.slice(currentIndex + 1, currentIndex + 3).map((report, idx) => (
                    <div 
                      key={report.id}
                      className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-3xl pointer-events-none"
                      style={{ 
                        zIndex: -idx,
                        transform: `translateY(${ (idx + 1) * 8 }px) scale(${ 1 - (idx + 1) * 0.04 })`,
                        opacity: 1 - (idx + 1) * 0.4
                      }}
                    />
                  ))}
                  
                  <SwipeCard 
                    key={filteredReports[currentIndex].id}
                    report={filteredReports[currentIndex]} 
                    onSwipe={handleSwipe} 
                    custom={lastSwipe}
                  />
                </div>
              )}
            </AnimatePresence>
          )}

          <div className="absolute bottom-[-10px] w-full flex justify-center gap-8 z-50 select-none">
             <button 
              disabled={isFinished}
              onClick={() => handleSwipe('like')}
              className="w-16 h-16 rounded-full border border-zinc-800 bg-zinc-900 text-primary flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-all shadow-xl disabled:opacity-20 cursor-pointer"
             >
                <AlertTriangle size={24} />
             </button>
             <button 
              disabled={isFinished}
              onClick={() => handleSwipe('dislike')}
              className="w-16 h-16 rounded-full border border-zinc-800 bg-zinc-900 text-red-500 flex items-center justify-center hover:bg-red-500/10 hover:border-red-500 transition-all shadow-xl disabled:opacity-20 cursor-pointer"
             >
                <RotateCcw size={24} />
             </button>
          </div>
        </div>
      )}

      {/* Grid Archive Archive Feed View */}
      {viewMode === 'grid' && !showReportForm && (
        <div className="space-y-8">
          {filteredReports.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-4 bg-zinc-900/40 border border-zinc-850 py-16 rounded-3xl"
            >
              <Search size={32} className="mx-auto text-zinc-600" />
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">No Match Found</h3>
              <p className="text-xs text-zinc-500">No reports matched your search, category or geolocational criteria.</p>
              <button
                onClick={resetFilters}
                className="py-2.5 px-5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Clear Filters
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
              {filteredReports.map((report) => (
              <motion.div
                key={report.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-zinc-900/40 rounded-2xl overflow-hidden border border-zinc-800 hover:border-primary/50 transition-all group flex flex-col h-full relative"
              >
                 <div className="relative aspect-[4/3] overflow-hidden">
                  <img 
                    src={report.imageUrl} 
                    alt={report.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute top-3 left-3 z-30 flex flex-col gap-1 items-start">
                    <span className="bg-zinc-900/80 backdrop-blur-md text-white px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md border border-white/10">
                      {report.category}
                    </span>
                    {(report.status === 'picked_up' || report.status === 'Cleaned') && (
                      <span className="bg-primary text-black px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-widest rounded-md border border-primary/20 shadow-md">
                        {t('cleanedUp')}
                      </span>
                    )}
                  </div>
                  <div className="absolute top-3 right-3 z-30">
                    <div className={cn(
                      "w-10 h-10 flex items-center justify-center text-sm font-bold text-black rounded-full border border-white/20 shadow-lg",
                      report.impactScore >= 8 ? "bg-red-500" : report.impactScore >= 5 ? "bg-amber-500" : "bg-primary"
                    )}>
                      {report.impactScore}
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-3 flex gap-2 z-30">
                    <div className="bg-zinc-900/80 backdrop-blur-md text-primary px-2 py-1 text-[9px] font-bold rounded-md border border-primary/20">
                      {report.likeCount || 0} Likes
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4 flex flex-col flex-1 relative z-10">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold tracking-tight text-white group-hover:text-primary transition-colors">
                      {report.title}
                    </h3>
                    <div className="flex flex-col gap-1 text-zinc-500 text-[10px] font-bold uppercase tracking-wide">
                      <div className="flex items-center gap-1">
                        <MapPin size={10} className="text-primary/70" />
                        <span className="truncate max-w-[200px]">{report.location?.address || 'Nearby'}</span>
                      </div>
                      <span>{report.createdAt?.toDate ? formatDistanceToNow(report.createdAt.toDate(), { addSuffix: true }) : 'Just now'}</span>
                    </div>
                  </div>

                  {report.description && (
                    <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3">
                      {report.description}
                    </p>
                  )}

                  <div className="pt-4 mt-auto border-t border-zinc-800/50">
                    <div className="bg-zinc-800/20 p-4 rounded-xl border border-zinc-800/50">
                      <p className="text-zinc-400 text-[12px] leading-relaxed">
                        {report.educationalTip}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700" />
                        <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">
                          {report.userName?.split(' ')[0] || 'User'}
                        </span>
                      </div>
                      <button 
                        onClick={() => shareReport(report)}
                        className="text-zinc-600 hover:text-primary transition-colors cursor-pointer"
                      >
                        <Share2 size={14} />
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedReport(report)}
                    className={cn(
                      "w-full py-3 rounded-xl font-bold uppercase text-[9px] tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border mt-2",
                      (report.status === 'picked_up' || report.status === 'Cleaned')
                        ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20" 
                        : "bg-primary text-black hover:bg-primary/95 border-primary"
                    )}
                  >
                    {(report.status === 'picked_up' || report.status === 'Cleaned') ? (
                      <>
                        <CheckCircle2 size={12} />
                        {t('disposedViewProof')}
                      </>
                    ) : (
                      <>
                        <Camera size={12} />
                        {t('pickItUpProof')}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
         )}
        </div>
      )}

      {/* D3 Geospatial Impact Map view Mode */}
      {viewMode === 'map' && !showReportForm && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pb-20"
        >
          <ReportMap reports={reports} />
        </motion.div>
      )}

      {/* Report Detail & Pick Up Modal */}
      <AnimatePresence>
        {selectedReport && (
          <ReportDetailModal 
            report={reports.find(r => r.id === selectedReport.id) || selectedReport} 
            onClose={() => setSelectedReport(null)} 
            onSuccess={() => {
              const updated = reports.find(r => r.id === selectedReport.id);
              if (updated) {
                setSelectedReport(updated);
              } else {
                setSelectedReport(null);
              }
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};
