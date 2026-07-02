import React, { useState, useRef } from 'react';
import { Camera, Upload, Send, Trash2, ArrowRight, Loader2, Info, Sparkles, AlertTriangle, MapPin, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeReport, createReport, generateImage, uploadImage } from '../lib/api';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';
import { useLanguage } from './LanguageContext';

interface ReportData {
  category: string;
  educationalTip: string;
  impactScore: number;
  title: string;
}

const POPULAR_CITIES = [
  { name: 'New York, USA', lat: 40.7128, lng: -74.0060 },
  { name: 'London, UK', lat: 51.5074, lng: -0.1278 },
  { name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Sydney, Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'Cape Town, South Africa', lat: -33.9249, lng: 18.4241 },
  { name: 'Cairo, Egypt', lat: 30.0444, lng: 31.2357 },
  { name: 'Sao Paulo, Brazil', lat: -23.5505, lng: -46.6333 },
  { name: 'Nairobi, Kenya', lat: -1.2921, lng: 36.8219 },
  { name: 'San Francisco, USA', lat: 37.7749, lng: -122.4194 },
  { name: 'Paris, France', lat: 48.8566, lng: 2.3522 },
  { name: 'Mumbai, India', lat: 19.0760, lng: 72.8777 },
  { name: 'Reykjavik, Iceland', lat: 64.1466, lng: -21.9426 }
];

export const ReportForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  // Geospatial states
  const [selectedCity, setSelectedCity] = useState(POPULAR_CITIES[0].name);
  const [lat, setLat] = useState(POPULAR_CITIES[0].lat);
  const [lng, setLng] = useState(POPULAR_CITIES[0].lng);
  const [address, setAddress] = useState(POPULAR_CITIES[0].name);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'detecting' | 'success' | 'error'>('idle');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    try {
      const base64Image = image.startsWith('data:image') ? image.split(',')[1] : image;
      const result = await analyzeReport(base64Image, description);
      setAnalysis(result);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateDepiction = async () => {
    if (!description) return;
    setIsGenerating(true);
    try {
      const generatedUrl = await generateImage(description);
      setImage(generatedUrl);
      setFileName("AI_Generated_Depiction.png");
      setAnalysis(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setLocationStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setAddress("My Current Location (GPS)");
        setSelectedCity("GPS");
        setLocationStatus('success');
      },
      (error) => {
        console.warn("GPS lookup denied or failed, staying on city selection: ", error);
        setLocationStatus('error');
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const handleCityChange = (cityName: string) => {
    const found = POPULAR_CITIES.find(c => c.name === cityName);
    if (found) {
      setLat(found.lat);
      setLng(found.lng);
      setAddress(found.name);
      setSelectedCity(found.name);
      setLocationStatus('idle');
    }
  };

  const handleSubmit = async () => {
    if (!image || !analysis) return;
    setLoading(true);
    try {
      let finalImageUrl = image;

      // If it's a new upload or generated (base64), upload it to Storage
      if (image.startsWith('data:')) {
        const response = await fetch(image);
        const blob = await response.blob();
        const fileName = `reports/${auth.currentUser?.uid}_${Date.now()}.png`;
        finalImageUrl = await uploadImage(blob, fileName);
      }

      await createReport({
        imageUrl: finalImageUrl,
        description,
        ...analysis,
        location: { lat, lng, address },
      });
      setImage(null);
      setFileName(null);
      setDescription('');
      setAnalysis(null);
      onSuccess();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 bg-zinc-950">
      {!image ? (
        <div className="space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square border border-zinc-800 bg-zinc-900/50 flex flex-col items-center justify-center gap-6 cursor-pointer hover:bg-primary/5 transition-all group relative overflow-hidden rounded-3xl"
          >
            <div className="absolute top-4 left-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
              Evidence Collection
            </div>
            <div className="w-20 h-20 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:scale-110 transition-transform text-white/50 group-hover:text-primary transition-all">
              <Camera size={40} />
            </div>
            <div className="text-center px-8">
              <p className="text-xl font-bold tracking-tight mb-2">{t('uploadLitterPhoto')}</p>
              <p className="text-xs text-zinc-500 px-10 leading-relaxed italic">{t('uploadPhotoDesc')}</p>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
          </div>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800/50" /></div>
            <div className="relative flex justify-center"><span className="bg-zinc-950 px-4 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{t('orLabel')}</span></div>
          </div>

          <div className="space-y-4">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              className="w-full bg-zinc-900/50 border border-zinc-800 text-white p-6 rounded-2xl min-h-[120px] focus:border-primary/50 outline-none transition-all text-sm leading-relaxed"
            />
            <button
              onClick={handleGenerateDepiction}
              disabled={isGenerating || !description}
              className="w-full flex items-center justify-center gap-3 bg-zinc-800 text-primary py-3 px-6 font-bold uppercase text-xs rounded-xl border border-zinc-700 hover:border-primary transition-all disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              {t('generateDepiction')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="relative aspect-[4/3] border border-zinc-800 rounded-3xl overflow-hidden">
            <img src={image} alt="Report" className="w-full h-full object-cover" />
            <button 
              onClick={() => { setImage(null); setFileName(null); setAnalysis(null); }}
              className="absolute top-4 right-4 bg-zinc-900/80 backdrop-blur-md text-white p-2 px-4 rounded-full border border-white/10 font-bold uppercase text-[10px] transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-2">Additional Context</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              className="w-full bg-zinc-900/50 border border-zinc-800 text-white p-6 rounded-2xl min-h-[100px] focus:border-primary/50 outline-none transition-all text-sm leading-relaxed"
            />
          </div>

          <AnimatePresence mode="wait">
            {!analysis ? (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 px-6 font-bold uppercase text-sm rounded-xl transition-all disabled:opacity-50 group shadow-xl cursor-pointer"
              >
                {isAnalyzing ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    {t('analyzeLitter')}
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="bg-zinc-900/50 border border-zinc-800 p-8 space-y-6 rounded-3xl backdrop-blur-sm shadow-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-white leading-none">{analysis.title}</h3>
                      <div className="mt-3 flex gap-2">
                        <span className="bg-primary/20 text-primary text-[9px] font-bold px-2 py-1 uppercase tracking-tight rounded-md">{analysis.category}</span>
                      </div>
                    </div>
                    <div className={cn(
                      "w-12 h-12 flex items-center justify-center text-lg font-bold text-black rounded-full border border-white/20",
                      analysis.impactScore >= 8 ? "bg-red-500" : analysis.impactScore >= 5 ? "bg-amber-500" : "bg-primary"
                    )}>
                      {analysis.impactScore}
                    </div>
                  </div>
                  
                  <div className="h-px bg-zinc-800/50" />

                  <div className="flex gap-4">
                    <div className="shrink-0 text-primary/60 pt-1">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{t('ecologyTip')}</p>
                      <p className="text-zinc-300 text-sm leading-relaxed">
                        {analysis.educationalTip}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Geospatial Location Anchor */}
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-zinc-400 tracking-wider flex items-center gap-2">
                      <MapPin size={14} className="text-primary animate-pulse" /> {t('selectCityLabel')}
                    </h4>
                    <p className="text-[10px] text-zinc-500 mt-1">Anchor your report globally so peers can spot the issue on our live radar map.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                    <select
                      value={selectedCity}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-primary/50 flex-1 cursor-pointer"
                    >
                      {selectedCity === 'GPS' && <option value="GPS">{t('currentLocationGps')}</option>}
                      {POPULAR_CITIES.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.lat.toFixed(2)}, {c.lng.toFixed(2)})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      className={cn(
                        "px-4 py-3 border rounded-xl font-bold uppercase text-[10px] transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                        locationStatus === 'detecting' ? "border-amber-500/30 text-amber-500 bg-amber-500/5" :
                        locationStatus === 'success' ? "border-primary text-primary bg-primary/10" :
                        "border-zinc-700 text-zinc-300 hover:border-white cursor-pointer"
                      )}
                    >
                      {locationStatus === 'detecting' ? (
                        <>
                          <Loader2 size={13} className="animate-spin" /> {t('detectingGps')}
                        </>
                      ) : locationStatus === 'success' ? (
                        <>{t('gpsActive')}</>
                      ) : (
                        <>{t('detectLocation')}</>
                      )}
                    </button>
                  </div>

                  <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/60 text-[10px] font-mono text-zinc-500 flex justify-between">
                    <span>LAT: {lat.toFixed(6)}</span>
                    <span>LNG: {lng.toFixed(6)}</span>
                  </div>
                </div>

                {/* Real-time Image Thumbnail Preview Card */}
                <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-3xl flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-2 right-3 text-[8px] font-mono text-zinc-600 font-bold uppercase tracking-wider">
                    Ready to Upload
                  </div>
                  <div className="w-16 h-16 rounded-xl border border-zinc-800 overflow-hidden shrink-0 bg-zinc-950">
                    <img src={image} alt="Thumbnail Verification" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Real-time Verification Preview</p>
                    <p className="text-white text-xs font-bold truncate mt-1">{fileName || "sighting_evidence.png"}</p>
                    <p className="text-[9px] text-primary/80 font-bold mt-1 uppercase tracking-wider">Confirmed & Bound</p>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 bg-primary text-black py-4 px-6 font-bold uppercase text-base rounded-xl transition-all disabled:opacity-50 shadow-xl cursor-pointer"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  {t('submitReport')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
