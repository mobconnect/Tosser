import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { subscribeToLeaderboard } from '../lib/api';
import { auth } from '../lib/firebase';
import { Trophy, Crown, Medal, Award, Search, User as UserIcon, Sparkles, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '../lib/utils';

export const Leaderboard: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToLeaderboard((data) => {
      setUsers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredUsers = users.filter(user => 
    (user.name || 'Anonymous User').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentUserUid = auth.currentUser?.uid;
  const currentUserRank = users.findIndex(user => user.uid === currentUserUid) + 1;
  const currentUserData = users.find(user => user.uid === currentUserUid);

  // Divide into podium (Top 3) and remaining list
  const topThree = filteredUsers.slice(0, 3);
  const remainingUsers = filteredUsers.slice(3);

  // Helper to get podium order: 2nd, 1st, 3rd for a beautiful centered layout
  const getPodiumSorted = () => {
    if (topThree.length === 0) return [];
    if (topThree.length === 1) return [topThree[0]]; // Only 1st place
    if (topThree.length === 2) return [topThree[1], topThree[0]]; // 2nd, 1st
    return [topThree[1], topThree[0], topThree[2]]; // 2nd, 1st, 3rd
  };

  const podiumUsers = getPodiumSorted();

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      {/* Header section */}
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-4xl font-bold tracking-tight text-white uppercase flex items-center justify-center gap-3">
          <Trophy className="text-primary animate-pulse" size={36} />
          Leaderboard
        </h2>
        <p className="text-zinc-500 text-sm">Environmental Resistance. Track the leading agents driving real impact.</p>
      </div>

      {/* Current User Standing Banner */}
      {currentUserData && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 border border-primary/25 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
              <Sparkles size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Your Resistance Rank</p>
              <h4 className="text-xl font-bold text-white uppercase mt-0.5">
                Agent <span className="text-primary font-mono font-black">#{currentUserRank}</span> — {currentUserData.name || 'Anonymous'}
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center sm:text-right">
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Your Points</p>
              <p className="text-2xl font-black text-white font-mono">{currentUserData.points || 0}</p>
            </div>
            <div className="h-8 w-[1px] bg-zinc-800 hidden sm:block" />
            <div className="text-center sm:text-right">
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Total Likes Given</p>
              <p className="text-2xl font-black text-white font-mono">{currentUserData.totalLikes || 0}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search resistance agents by alias..."
          className="w-full bg-zinc-900/60 border border-zinc-800/80 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder-zinc-600 outline-none focus:border-primary/50 transition-all shadow-lg"
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-64 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl animate-pulse flex items-center justify-center">
            <p className="text-zinc-600 font-bold uppercase tracking-widest text-[10px]">Scanning active registry...</p>
          </div>
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 bg-zinc-900/20 border border-zinc-800/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10">
          <p className="text-zinc-500 text-sm font-medium">No agents found matching your search.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top 3 Podium Layout (Only when there's no active search filter, or if search matches some of top 3) */}
          {searchQuery === '' && topThree.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-8">
              {podiumUsers.map((user) => {
                const originalIndex = filteredUsers.findIndex(u => u.uid === user.uid);
                const rank = originalIndex + 1;
                const isCurrentUser = user.uid === currentUserUid;

                let cardHeight = "h-auto md:h-64";
                let badgeColor = "bg-zinc-800 text-zinc-400 border-zinc-700";
                let rankIcon = <Award size={20} className="text-zinc-400" />;
                let shadowColor = "shadow-md";

                if (rank === 1) {
                  cardHeight = "h-auto md:h-76 border-primary/40 bg-zinc-900/90";
                  badgeColor = "bg-primary text-black border-primary";
                  rankIcon = <Crown size={28} className="text-primary animate-bounce duration-1000" />;
                  shadowColor = "shadow-[0_0_30px_rgba(16,185,129,0.15)]";
                } else if (rank === 2) {
                  cardHeight = "h-auto md:h-68 border-zinc-700 bg-zinc-900/60";
                  badgeColor = "bg-zinc-400 text-black border-zinc-300";
                  rankIcon = <Medal size={24} className="text-zinc-300" />;
                } else if (rank === 3) {
                  cardHeight = "h-auto md:h-60 border-zinc-800 bg-zinc-900/40";
                  badgeColor = "bg-amber-700 text-white border-amber-600";
                  rankIcon = <Award size={22} className="text-amber-500" />;
                }

                return (
                  <motion.div
                    key={user.uid}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: rank * 0.1 }}
                    className={cn(
                      "border p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden transition-all duration-300",
                      cardHeight,
                      shadowColor,
                      isCurrentUser ? "ring-2 ring-primary/45 bg-zinc-900" : "bg-zinc-900/50 hover:bg-zinc-900/80"
                    )}
                  >
                    {/* Top Section */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {rankIcon}
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Rank {rank}</span>
                      </div>
                      <div className={cn("px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border", badgeColor)}>
                        {user.points || 0} pts
                      </div>
                    </div>

                    {/* Middle Section: Profile pic and username */}
                    <div className="flex flex-col items-center text-center space-y-3 my-4">
                      <div className="w-16 h-16 rounded-full border-2 border-zinc-800 overflow-hidden bg-zinc-950 relative">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-500">
                            <UserIcon size={24} />
                          </div>
                        )}
                        {rank === 1 && (
                          <div className="absolute -top-1 right-0 bg-primary rounded-full p-0.5 border border-black">
                            <Sparkles size={8} className="text-black" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="font-bold text-white text-base tracking-tight truncate max-w-[180px]">
                          {user.name || 'Anonymous Agent'}
                        </h3>
                        <p className="text-[10px] text-zinc-500 uppercase font-semibold">{user.pronouns || 'they/them'}</p>
                      </div>
                    </div>

                    {/* Footer Stats inside card */}
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-zinc-800/60 text-center">
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-zinc-500 uppercase">
                          <ThumbsUp size={10} className="text-primary" /> Likes
                        </div>
                        <p className="text-xs font-black text-white font-mono">{user.totalLikes || 0}</p>
                      </div>
                      <div className="space-y-0.5 border-l border-zinc-800/60">
                        <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-zinc-500 uppercase">
                          <ThumbsDown size={10} className="text-red-500" /> Dislikes
                        </div>
                        <p className="text-xs font-black text-white font-mono">{user.totalDislikes || 0}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Leaderboard Table / List for ranks 4+ (and full list if searching) */}
          <div className="space-y-3">
            {searchQuery === '' && remainingUsers.length > 0 && (
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-2">Remaining Ranks</h3>
            )}
            
            <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-3xl divide-y divide-zinc-900 overflow-hidden">
              {(searchQuery !== '' ? filteredUsers : remainingUsers).map((user, idx) => {
                const rank = searchQuery !== '' ? idx + 1 : idx + 4;
                const isCurrentUser = user.uid === currentUserUid;

                return (
                  <motion.div
                    key={user.uid}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (idx % 10) * 0.05 }}
                    className={cn(
                      "p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:bg-zinc-900/40",
                      isCurrentUser ? "bg-primary/5 border-l-2 border-primary" : "bg-transparent"
                    )}
                  >
                    {/* Rank, avatar, name */}
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="w-8 shrink-0 text-center">
                        <span className="font-mono text-xs font-bold text-zinc-500">#{rank}</span>
                      </div>

                      <div className="w-10 h-10 rounded-full border border-zinc-800 overflow-hidden bg-zinc-950 shrink-0">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            <UserIcon size={16} />
                          </div>
                        )}
                      </div>

                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm truncate max-w-[150px] sm:max-w-xs">
                            {user.name || 'Anonymous Agent'}
                          </h4>
                          {isCurrentUser && (
                            <span className="bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 text-[8px] font-bold uppercase rounded">
                              YOU
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">
                          {user.pronouns || 'they/them'}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 border-zinc-900/60 pt-3 sm:pt-0 shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="text-center sm:text-right">
                          <div className="flex items-center justify-center sm:justify-end gap-1 text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                            <ThumbsUp size={8} className="text-primary" /> Likes
                          </div>
                          <p className="font-mono text-xs text-zinc-400 font-bold">{user.totalLikes || 0}</p>
                        </div>
                        <div className="text-center sm:text-right">
                          <div className="flex items-center justify-center sm:justify-end gap-1 text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                            <ThumbsDown size={8} className="text-red-500" /> Dislikes
                          </div>
                          <p className="font-mono text-xs text-zinc-400 font-bold">{user.totalDislikes || 0}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-sm font-black text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl inline-block min-w-[70px] text-center">
                          {user.points || 0} pt
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
