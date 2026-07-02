import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, CheckCircle2, DollarSign, ExternalLink, Sparkles, User, AlertTriangle, Image as ImageIcon, Loader2, QrCode, Printer, Download } from 'lucide-react';
import { auth } from '../lib/firebase';
import { uploadImage, pickUpReport, getUserProfile } from '../lib/api';
import { useLanguage } from './LanguageContext';
import QRCode from 'qrcode';

interface ReportDetailModalProps {
  report: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({ report, onClose, onSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  
  // Profiles
  const [reporterProfile, setReporterProfile] = useState<any>(null);
  const [resolverProfile, setResolverProfile] = useState<any>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [donationAmount, setDonationAmount] = useState('5.00');
  const [paypalLink, setPaypalLink] = useState('');

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoadingProfiles(true);
      try {
        const currentUid = auth.currentUser?.uid;
        if (currentUid) {
          const cur: any = await getUserProfile(currentUid);
          if (cur && cur.paypalLink) {
            setPaypalLink(cur.paypalLink);
          }
        }
        if (report.userId) {
          const rep: any = await getUserProfile(report.userId);
          setReporterProfile(rep);
        }
        if (report.resolverId) {
          const res: any = await getUserProfile(report.resolverId);
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
      await pickUpReport(report.id, proofUrl, paypalLink);
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
      return cleanInfo;
    }
    if (cleanInfo.includes("@")) {
      return `https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=${encodeURIComponent(cleanInfo)}&currency_code=USD&amount=${amount}`;
    }
    return `https://paypal.me/${cleanInfo}/${amount}`;
  };

  const statusColors = {
    reported: "border-red-500/20 bg-red-500/10 text-red-400",
    picked_up: "border-primary/20 bg-primary/10 text-primary",
  };

  const isResolved = report.status === 'picked_up' || report.status === 'Cleaned';

  const paypalTarget = isResolved 
    ? (resolverProfile?.paypalLink || '') 
    : (reporterProfile?.paypalLink || '');
    
  const hasPaypal = !!paypalTarget.trim();

  // QR & Poster Kit State
  const [showQrKit, setShowQrKit] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrType, setQrType] = useState<'app' | 'paypal'>('app');

  useEffect(() => {
    const encodeValue = qrType === 'paypal' && paypalTarget.trim()
      ? getPaypalHref(paypalTarget, donationAmount)
      : `${window.location.origin}/?reportId=${report.id}`;

    QRCode.toDataURL(encodeValue, {
      margin: 1,
      width: 400,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
    .then(url => {
      setQrCodeUrl(url);
    })
    .catch(err => {
      console.error("Failed to generate QR code", err);
    });
  }, [qrType, report.id, reporterProfile, resolverProfile, donationAmount, paypalTarget]);

  const downloadQrCode = () => {
    if (!qrCodeUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeUrl;
    a.download = `tosser-sighting-${report.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    window.print();
  };

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
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('activeLitter')}</p>
                <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 relative">
                  <img src={report.imageUrl} alt={report.title} className="w-full h-full object-cover" />
                  <div className="absolute top-4 left-4 bg-red-500 text-black text-[9px] font-bold px-2.5 py-1 uppercase rounded-md shadow-md">
                    {t('activeLitter')}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('photoBeforeLabel')}</p>
                  <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950">
                    <img src={report.imageUrl} alt="Before" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{t('photoAfterLabel')}</p>
                  <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-primary/30 bg-zinc-950 relative">
                    <img src={report.proofImageUrl} alt="After Proof" className="w-full h-full object-cover" />
                    <div className="absolute bottom-4 left-4 bg-primary text-black text-[9px] font-bold px-2.5 py-1 uppercase rounded-md shadow-md flex items-center gap-1">
                      <CheckCircle2 size={10} /> {t('cleanedUp')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Location block */}
            <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800 space-y-2">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('approximateLocation')}</p>
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
                    {isResolved ? t('cleanedSolved') : t('awaitingCleanup')}
                  </span>
                  <span className="text-zinc-500 font-mono text-[10px] font-bold ml-auto">
                    SCORE: <span className="text-primary font-black">{report.impactScore}</span>
                  </span>
                </div>
                
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase leading-none">
                  {report.title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {report.description || t('noDescriptionSupplied')}
                </p>

                {/* QR Code & Poster Kit Trigger Button */}
                <div className="flex flex-wrap gap-2 pt-1.5">
                  <button
                    onClick={() => setShowQrKit(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95 select-none"
                  >
                    <QrCode size={13} />
                    <span>QR Code & Poster Kit</span>
                  </button>
                </div>
              </div>

              {/* Impact/Educational Tip */}
              <div className="bg-primary/5 border border-primary/25 rounded-2xl p-4 space-y-1">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{t('ecologyAdviceLabel')}</p>
                <p className="text-zinc-300 text-xs leading-relaxed">{report.educationalTip}</p>
              </div>

              {/* Profiles Section (Reporter and Resolver) */}
              <div className="space-y-4 border-t border-zinc-800/80 pt-6">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('involvedAgents')}</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Reporter Profile */}
                  <div className="bg-zinc-950/30 p-4 rounded-xl border border-zinc-800 space-y-3">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{t('reportingAgent')}</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                        <User size={14} />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-white truncate">{report.userName || t('anonymousAgent')}</p>
                        <p className="text-[9px] text-zinc-500 uppercase font-semibold">10 {t('pointsShort')} {t('points')}</p>
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
                          {t('tipReporter')}
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    ) : (
                      <p className="text-[9px] text-zinc-650 italic">{t('reporterNoPaypal')}</p>
                    )}
                  </div>

                  {/* Resolver Profile (Only if Resolved) */}
                  {isResolved ? (
                    <div className="bg-zinc-950/30 p-4 rounded-xl border border-primary/20 space-y-3">
                      <p className="text-[9px] font-bold text-primary uppercase tracking-widest">{t('resolverAgent')}</p>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                          <CheckCircle2 size={14} />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-white truncate">{report.resolverName || t('anonymousAgent')}</p>
                          <p className="text-[9px] text-primary uppercase font-bold">50 {t('pointsShort')} {t('points')}</p>
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
                            {t('bountyResolver')}
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      ) : (
                        <p className="text-[9px] text-zinc-650 italic">{t('resolverNoPaypal')}</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-zinc-950/20 p-4 rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center">
                      <AlertTriangle size={16} className="text-zinc-600 mb-1" />
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{t('awaitingResolution')}</p>
                      <p className="text-[8px] text-zinc-650 mt-0.5">{t('beTheAgent')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* PayPal Bounties Settings Dropdown (Only show if at least one PayPal link exists) */}
              {!loadingProfiles && (reporterProfile?.paypalLink || resolverProfile?.paypalLink) && (
                <div className="flex items-center justify-between gap-4 bg-zinc-950/30 px-4 py-3 rounded-xl border border-zinc-800/60 font-mono text-sm">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{t('selectBountyAmount')}</span>
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
                    <h4 className="text-sm font-bold text-white uppercase tracking-tight">{t('pickItUpLabel')}</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{t('disposalRewardLabel')}</p>
                  </div>
                  <div className="bg-primary/10 border border-primary/20 px-2 py-1 rounded text-[8px] font-bold text-primary uppercase">
                    +50 {t('pointsShort')}
                  </div>
                </div>

                {/* PayPal Input block */}
                <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800 space-y-2">
                  <label className="block text-[10px] font-black text-primary uppercase tracking-widest font-mono">
                    {t('yourPaypalLink')}
                  </label>
                  <input 
                    type="text"
                    value={paypalLink}
                    onChange={(e) => setPaypalLink(e.target.value)}
                    placeholder="e.g. paypal.me/yourusername or yourpaypalemail@domain.com"
                    className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded-xl focus:border-primary/50 outline-none text-white transition-all placeholder-zinc-650 text-xs"
                  />
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider leading-relaxed">
                    {t('addingPaypalLink')}
                  </p>
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
                      {t('takeSelectPhotoProof')}
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
                          {t('uploadingProof')}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          {t('submitDisposalProof')}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Style tag specifically for printing layout */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background-color: white !important;
              color: black !important;
              font-family: system-ui, -apple-system, sans-serif !important;
            }
            #root, header, main, footer, nav, .fixed, .absolute, [role="dialog"], .bg-black {
              display: none !important;
              visibility: hidden !important;
            }
            .printable-poster {
              display: flex !important;
              visibility: visible !important;
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100vw !important;
              height: 100vh !important;
              background: white !important;
              color: black !important;
              z-index: 9999999 !important;
              padding: 40px !important;
              box-sizing: border-box !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              align-items: center !important;
              text-align: center !important;
            }
            .printable-poster * {
              display: block !important;
              visibility: visible !important;
            }
          }
        ` }} />

        {/* Printable Poster Elements (hidden on screen, only visible via @media print) */}
        <div className="hidden printable-poster bg-white text-black p-12 min-h-screen flex flex-col justify-between items-center text-center">
          <div style={{ border: '8px double black', padding: '2.5rem', height: '100%', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
            
            <div className="space-y-4">
              <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#666' }}>
                ENVIRONMENTAL RESISTANCE FLYER
              </div>
              <h1 style={{ fontSize: '48px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: '1', margin: '15px 0', color: '#000000' }}>
                LITTER FLAGGED
              </h1>
              <div style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', background: '#000000', color: '#ffffff', padding: '6px 20px', display: 'inline-block' }}>
                {report.category || 'GENERAL WASTE'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '40px', alignItems: 'center', margin: '40px 0', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code" style={{ width: '220px', height: '220px', border: '3px solid black', padding: '5px', background: 'white' }} />
              )}
              <div style={{ textAlign: 'left', maxWidth: '380px' }} className="space-y-3">
                <h2 style={{ fontSize: '26px', fontWeight: '900', textTransform: 'uppercase', color: '#000000', margin: '0 0 10px 0' }}>
                  {report.title}
                </h2>
                <p style={{ fontSize: '14px', color: '#333333', lineHeight: '1.5', margin: '0 0 10px 0' }}>
                  {report.description || 'Reported litter sighting awaiting community clean-up.'}
                </p>
                <div style={{ fontSize: '12px', color: '#555555', fontFamily: 'monospace', lineHeight: '1.4' }}>
                  📍 {report.location?.address || 'Report Location'}<br/>
                  Coords: {report.location?.lat?.toFixed(6)}, {report.location?.lng?.toFixed(6)}
                </div>
              </div>
            </div>

            <div style={{ width: '100%' }}>
              <div style={{ borderTop: '2px dashed black', paddingTop: '20px', width: '100%', margin: '0 auto 20px auto' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#000000', margin: '0 0 10px 0' }}>
                SCAN TO INTERACT & HELP
              </h3>
              <p style={{ fontSize: '13px', color: '#444444', maxWidth: '520px', margin: '0 auto', lineHeight: '1.6' }}>
                Scan this code with your phone camera to open this report in the <strong>Tosser</strong> app.
                You can upload clean-up proof to earn reward points, or send a secure tip via PayPal to support local environmental efforts!
              </p>
              
              {qrType === 'paypal' && hasPaypal && (
                <div style={{ marginTop: '20px', background: '#f4f4f5', padding: '14px', border: '1px dashed #000000', borderRadius: '8px', display: 'inline-block' }}>
                  <p style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#000000', margin: 0 }}>
                    Direct PayPal Support Enabled
                  </p>
                  <p style={{ fontSize: '11px', color: '#555555', margin: '2px 0 0 0' }}>
                    Tips scan directly to: <strong>{paypalTarget}</strong>
                  </p>
                </div>
              )}
            </div>

            <div style={{ fontSize: '10px', color: '#888888', fontFamily: 'monospace', marginTop: '40px', letterSpacing: '0.1em' }}>
              GENERATED VIA TOSSER — ACTION = IMPACT
            </div>
          </div>
        </div>

        {/* QR Code & Poster Kit Overlay Overlay */}
        <AnimatePresence>
          {showQrKit && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-md z-40 flex flex-col items-center justify-center p-6 md:p-8"
            >
              <button
                onClick={() => setShowQrKit(false)}
                className="absolute top-6 right-6 p-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full border border-zinc-800 transition-all z-50 cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-6 text-center max-h-[90vh] overflow-y-auto shadow-2xl">
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-tight text-white flex items-center justify-center gap-2">
                    <QrCode className="text-primary" size={20} />
                    Sighting QR & Poster Kit
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-mono mt-1 uppercase tracking-wider">
                    Print or display at site to recruit other agents
                  </p>
                </div>

                {/* QR Code Image */}
                <div className="bg-white p-4 rounded-2xl inline-block mx-auto border-4 border-zinc-800 shadow-xl">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="Sighting QR Code" className="w-48 h-48 block" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-zinc-400 font-mono text-xs">
                      Generating...
                    </div>
                  )}
                </div>

                {/* Scan Type Configuration */}
                <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-800 text-left space-y-3">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">
                    Choose Scan Action Target:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setQrType('app')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                        qrType === 'app'
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="uppercase font-black tracking-wider text-[10px]">App Sighting</span>
                      <span className="text-[9px] font-normal text-zinc-500">Scan to View/Clean</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQrType('paypal')}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                        qrType === 'paypal'
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="uppercase font-black tracking-wider text-[10px]">Direct PayPal</span>
                      <span className="text-[9px] font-normal text-zinc-500">Scan to Tip Agent</span>
                    </button>
                  </div>

                  {qrType === 'paypal' && (
                    <div className="text-[10px] text-zinc-400 leading-relaxed font-mono p-2 bg-zinc-900/60 rounded-xl border border-zinc-800">
                      {hasPaypal ? (
                        <p className="text-emerald-400">
                          ✓ Linked PayPal detected: <strong className="break-all">{paypalTarget}</strong>
                        </p>
                      ) : (
                        <p className="text-amber-500">
                          ⚠ Warning: No linked PayPal detected. Scanning will fall back to Interactive App Page. Set PayPal in Profile!
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Kit Action Buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={handlePrint}
                    className="w-full py-3 bg-primary text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all hover:bg-primary/90 flex items-center justify-center gap-1.5 cursor-pointer shadow-xl"
                  >
                    <Printer size={14} />
                    Print 8.5x11 Poster Sighting
                  </button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={downloadQrCode}
                      className="py-2.5 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-white font-bold text-[10px] uppercase tracking-wider rounded-xl border border-zinc-800 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download size={12} />
                      Download QR
                    </button>

                    <button
                      onClick={() => setShowQrKit(false)}
                      className="py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center cursor-pointer"
                    >
                      Back to Sighting
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
