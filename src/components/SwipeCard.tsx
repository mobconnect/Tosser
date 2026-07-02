import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { ThumbsUp, ThumbsDown, Info, AlertTriangle, MapPin, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
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
  tosserCount?: number;
  tossitCount?: number;
  likeCount?: number;
  dislikeCount?: number;
}

interface SwipeCardProps {
  report: Report;
  onSwipe: (type: 'like' | 'dislike') => void;
  custom?: 'like' | 'dislike' | null;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({ report, onSwipe, custom }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const scale = useTransform(x, [-200, 0, 200], [0.8, 1, 0.8]);
  
  const tosserOpacity = useTransform(x, [-100, -50], [1, 0]);
  const tosserScale = useTransform(x, [-150, -50], [1.2, 1]);
  
  const tossitOpacity = useTransform(x, [50, 100], [0, 1]);
  const tossitScale = useTransform(x, [50, 150], [1, 1.2]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x < -100) {
      onSwipe('like');
    } else if (info.offset.x > 100) {
      onSwipe('dislike');
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await shareReport(report);
  };

  const variants = {
    enter: { x: 0, rotate: 0, opacity: 1, scale: 1 },
    center: { x: 0, rotate: 0, opacity: 1, scale: 1 },
    exit: (direction: string) => ({
      x: direction === 'like' ? -1000 : 1000,
      rotate: direction === 'like' ? -90 : 90,
      opacity: 0,
      transition: { duration: 0.5 }
    })
  };

  return (
    <motion.div
      style={{ x, rotate, opacity, scale }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.02 }}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      custom={custom}
      className="absolute inset-0 cursor-grab active:cursor-grabbing z-40"
    >
      <div className="bg-zinc-900 h-full w-full border border-zinc-800 rounded-3xl flex flex-col relative overflow-hidden shadow-2xl">
        {/* Swipe Indicators */}
        <motion.div 
          style={{ opacity: tosserOpacity, scale: tosserScale }}
          className="absolute top-1/4 left-10 z-50 border-4 border-primary px-6 py-2 bg-zinc-900 rounded-xl text-primary font-bold uppercase tracking-tight text-4xl rotate-[-20deg] pointer-events-none shadow-lg"
        >
          LIKE
        </motion.div>
        <motion.div 
          style={{ opacity: tossitOpacity, scale: tossitScale }}
          className="absolute top-1/4 right-10 z-50 border-4 border-red-500 px-6 py-2 bg-zinc-900 rounded-xl text-red-500 font-bold uppercase tracking-tight text-4xl rotate-[20deg] pointer-events-none shadow-lg"
        >
          DISLIKE
        </motion.div>

        {/* Image Area */}
        <div className="relative flex-1 overflow-hidden">
          <img src={report.imageUrl} alt={report.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
          
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex gap-3 mb-3">
              <div className="bg-primary/20 backdrop-blur-md text-primary px-3 py-1 text-[10px] font-bold rounded-lg border border-primary/20">
                {report.likeCount || 0} Likes
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-zinc-800/80 backdrop-blur-md text-zinc-300 text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-md">{report.category}</span>
              <span className="text-zinc-500 text-[9px] font-medium uppercase tracking-wider">
                {report.createdAt?.toDate ? formatDistanceToNow(report.createdAt.toDate(), { addSuffix: true }) : 'Recently'}
              </span>
            </div>
            <h3 className="text-3xl font-bold tracking-tight text-white leading-tight">{report.title}</h3>
          </div>

          <div className="absolute top-6 right-6">
            <div className={cn(
              "w-12 h-12 flex items-center justify-center text-lg font-bold text-black rounded-full border border-white/20 shadow-xl",
              report.impactScore >= 8 ? "bg-red-500" : report.impactScore >= 5 ? "bg-amber-500" : "bg-primary"
            )}>
              {report.impactScore}
            </div>
          </div>
        </div>

        {/* Info Area */}
        <div className="p-6 space-y-4">
          <div className="flex gap-3">
            <div className="shrink-0 text-primary/60 pt-1">
              <Info size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Impact Insight</p>
              <p className="text-zinc-300 text-sm leading-relaxed line-clamp-3">
                {report.educationalTip}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700" />
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                  {report.userName?.split(' ')[0] || 'User'}
                </span>
              </div>
              <button 
                onClick={handleShare}
                className="text-zinc-600 hover:text-primary transition-colors"
              >
                <Share2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
