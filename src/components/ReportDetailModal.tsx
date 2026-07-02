import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Camera, CheckCircle2, DollarSign, ExternalLink, Sparkles, User, AlertTriangle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { auth } from '../lib/firebase';
import { uploadImage, pickUpReport, getUserProfile } from '../lib/api';

interface ReportDetailModalProps {
  report: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({ report, onClose, onSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Profiles
  const [reporterProfile, setReporterProfile] = useState<any>(null);
  const [resolverProfile, setResolverProfile] = useState<any>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [donationAmount, setDonationAmount] = useState('5.00');

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoadingProfiles(true);
      try {
        if (report.userId) {
          const rep = await getUserProfile(report.userId);
          setReporterProfile(rep);
        }
        if (report.resolverId) {
          const res = await getUserProfile(report.resolverId);
          setResolverProfile(res);
        }
      } catch (err) {
        console.error("Error fetching user profiles:", err);
      } finally {
        setLoadingProfiles(false);
      }
    };

    fetchProfiles();
  }, [report]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmitProof = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const path = `proofs/${report.id}_${Date.now()}_proof.jpg`;
      const proofUrl = await uploadImage(selectedFile, path);
      await pickUpReport(report.id, proofUrl);
      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Failed to submit pickup proof. Ensure storage bucket is configured.");
    } finally {
      setUploading(false);
    }
  };

  const getPaypalHref = (paypalInfo: string, amount: string) => {
    if (!paypalInfo) return "";
    const cleanInfo = paypalInfo.trim();
    if (cleanInfo.startsWith("http")) {
      // If it's already a full link
      return cleanInfo;
    }
    if (cleanInfo.includes("@")) {
      // If it is a PayPal email
      return `https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=${encodeURIComponent(cleanInfo)}&currency_code=USD&amount=${amount}`;
    }
    // If it's a paypal.me username
    return `https://paypal.me/${cleanInfo}/${amount}`;
  };

  const statusColors = {
    reported: "border-red-500/20 bg-red-500/10 text-red-400",
    picked_up: "border-primary/20 bg-primary/10 text-primary",
  };

  const isResolved = report.status === 'picked_up';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 md:p-8"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full border border-zinc-800 transition-all z-20 cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
          
          {/* Left Side: Images Section */}
          <div className="lg:col-span-6 space-y-6">
            {!isResolved ? (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Reported Litter Sighting</p>
                <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 relative">
                  <img src={report.imageUrl} alt={report.title} className="w-full h-full object-cover" />
                  <div className="absolute top-4 left-4 bg-red-500 text-black text-[9px] font-bold px-2.5 py-1 uppercase rounded-md shadow-md">
                    Active Litter
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Before (Reported)</p>
                  <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950">
                    <img src={report.imageUrl} alt="Before" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">After (Picked Up Proof)</p>
                  <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-primary/30 bg-zinc-950 relative">
                    <img src={report.proofImageUrl} alt="After Proof" className="w-full h-full object-cover" />
                    <div className="absolute bottom-4 left-4 bg-primary text-black text-[9px] font-bold px-2.5 py-1 uppercase rounded-md shadow-md flex items-center gap-1">
                      <CheckCircle2 size={10} /> Cleaned Up
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Location block */}
            <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800 space-y-2">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Approximate Location</p>
              <p className="text-white text-xs font-bold leading-relaxed">{report.location?.address || 'Nearby / Undefined'}</p>
              {report.location?.lat && report.location?.lng && (
                <p className="text-zinc-600 font-mono text-[10px]">
                  Coords: {report.location.lat.toFixed(6)}, {report.location.lng.toFixed(6)}
                </p>
              )}
            </div>
          </div>

          {/* Right Side: Details & Bounties */}
          <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Category, Title, Description */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="bg-zinc-800 text-zinc-300 text-[10px] font-black px-2.5 py-1 rounded-md border border-zinc-700 uppercase tracking-wider">
                    {report.category}
                  </span>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-md border uppercase tracking-wider ${isResolved ? statusColors.picked_up : statusColors.reported}`}>
                    {isResolved ? 'Cleaned / Solved' : 'Awaiting Cleanup'}
                  </span>
                  <span className="text-zinc-500 font-mono text-[10px] font-bold ml-auto">
                    SCORE: <span className="text-primary font-black">{report.impactScore}</span>
                  </span>
                </div>
                
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase leading-none">
                  {report.title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {report.description || 'No description supplied by reporter.'}
                </p>
              </div>

              {/* Impact/Educational Tip */}
              <div className="bg-primary/5 border border-primary/25 rounded-2xl p-4 space-y-1">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Ecology Advisor Alert</p>
                <p className="text-zinc-300 text-xs leading-relaxed">{report.educationalTip}</p>
              </div>

              {/* Profiles Section (Reporter and Resolver) */}
              <div className="space-y-4 border-t border-zinc-800/80 pt-6">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Involved Agents</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Reporter Profile */}
                  <div className="bg-zinc-950/30 p-4 rounded-xl border border-zinc-800 space-y-3">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Reporting Agent</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                        <User size={14} />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-white truncate">{report.userName || 'Anonymous Agent'}</p>
                        <p className="text-[9px] text-zinc-500 uppercase font-semibold">10 pts rewarded</p>
                      </div>
                    </div>

                    {/* Reporter Donation Area */}
                    {loadingProfiles ? (
                      <div className="h-8 bg-zinc-900/40 rounded animate-pulse" />
                    ) : reporterProfile?.paypalLink ? (
                      <div className="space-y-2 pt-2 border-t border-zinc-900">
                        <a 
                          href={getPaypalHref(reporterProfile.paypalLink, donationAmount)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-white hover:text-primary font-bold text-[9px] uppercase tracking-wide rounded-lg border border-zinc-800 hover:border-primary/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <DollarSign size={12} className="text-primary" />
                          Tip Reporter via PayPal
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    ) : (
                      <p className="text-[9px] text-zinc-600 italic">Reporter hasn't linked PayPal yet.</p>
                    )}
                  </div>

                  {/* Resolver Profile (Only if Resolved) */}
                  {isResolved ? (
                    <div className="bg-zinc-950/30 p-4 rounded-xl border border-primary/20 space-y-3">
                      <p className="text-[9px] font-bold text-primary uppercase tracking-widest">Resolver Agent</p>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                          <CheckCircle2 size={14} />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-white truncate">{report.resolverName || 'Anonymous Agent'}</p>
                          <p className="text-[9px] text-primary uppercase font-bold">50 pts rewarded</p>
                        </div>
                      </div>

                      {/* Resolver Donation Area */}
                      {loadingProfiles ? (
                        <div className="h-8 bg-zinc-900/40 rounded animate-pulse" />
                      ) : resolverProfile?.paypalLink ? (
                        <div className="space-y-2 pt-2 border-t border-zinc-900">
                          <a 
                            href={getPaypalHref(resolverProfile.paypalLink, donationAmount)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 bg-primary hover:bg-primary/90 text-black font-extrabold text-[9px] uppercase tracking-wide rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <DollarSign size={12} />
                            Bounty Resolver via PayPal
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      ) : (
                        <p className="text-[9px] text-zinc-600 italic">Resolver hasn't linked PayPal yet.</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-zinc-950/20 p-4 rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center">
                      <AlertTriangle size={16} className="text-zinc-600 mb-1" />
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Awaiting Resolution</p>
                      <p className="text-[8px] text-zinc-650 mt-0.5">Be the agent to pick up this litter.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* PayPal Bounties Settings Dropdown (Only show if at least one PayPal link exists) */}
              {!loadingProfiles && (reporterProfile?.paypalLink || resolverProfile?.paypalLink) && (
                <div className="flex items-center justify-between gap-4 bg-zinc-950/30 px-4 py-3 rounded-xl border border-zinc-800/60">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Select PayPal Bounty Amount:</span>
                  <div className="flex gap-2">
                    {['2.00', '5.00', '10.00', '20.00'].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setDonationAmount(amt)}
                        className={`px-2 py-1 text-[10px] font-mono font-bold rounded-md border transition-all cursor-pointer ${
                          donationAmount === amt 
                            ? 'bg-primary/15 border-primary text-primary' 
                            : 'border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        ${parseFloat(amt).toFixed(0)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ACTION FOOTER: Submit Pick Up Proof (Only show if NOT resolved) */}
            {!isResolved && (
              <div className="border-t border-zinc-800/80 pt-6 mt-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-tight">Pick It Up!</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Upload visual proof of disposal to claim 50 reward points.</p>
                  </div>
                  <div className="bg-primary/10 border border-primary/20 px-2 py-1 rounded text-[8px] font-bold text-primary uppercase">
                    +50 PTS
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    className="hidden" 
                  />
                  
                  {previewUrl ? (
                    <div className="w-full sm:w-24 h-24 rounded-xl border border-primary/45 overflow-hidden shrink-0 relative">
                      <img src={previewUrl} alt="Proof preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                        className="absolute top-1 right-1 bg-black/80 hover:bg-black p-1 rounded-full text-zinc-400 hover:text-white transition-all cursor-pointer"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={triggerFileInput}
                      className="w-full sm:w-auto px-6 py-4 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white font-bold uppercase text-[10px] rounded-xl border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Camera size={14} className="text-primary" />
                      Take/Select Photo Proof
                    </button>
                  )}

                  {selectedFile && (
                    <button
                      onClick={handleSubmitProof}
                      disabled={uploading}
                      className="w-full sm:flex-1 py-4 bg-primary text-black font-extrabold uppercase text-[10px] rounded-xl shadow-xl transition-all hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Uploading Proof...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          Submit Disposal Proof
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
