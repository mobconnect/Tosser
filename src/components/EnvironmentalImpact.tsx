import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as d3 from 'd3';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Leaf, Users, Droplet, Flame, TrendingUp, HelpCircle, Sparkles } from 'lucide-react';

interface ReportData {
  id: string;
  userId: string;
  resolverId?: string;
  status: string;
  category: string;
  impactScore?: number;
  likeCount?: number;
  dislikeCount?: number;
  createdAt?: any;
  pickedUpAt?: any;
}

export const EnvironmentalImpact: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'verified' | 'projection'>('verified');
  const [userReports, setUserReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulation state
  const [simWeeklyCleanups, setSimWeeklyCleanups] = useState<number>(3);
  const [simWeightCategory, setSimWeightCategory] = useState<number>(5); // Default weight in kg
  const [simShareFactor, setSimShareFactor] = useState<number>(3);

  // Chart Container DOM Refs
  const barChartRef = useRef<SVGSVGElement | null>(null);
  const areaChartRef = useRef<SVGSVGElement | null>(null);
  const barContainerRef = useRef<HTMLDivElement | null>(null);
  const areaContainerRef = useRef<HTMLDivElement | null>(null);

  // Responsive dimensions state
  const [dimensions, setDimensions] = useState({ width: 400, height: 260 });

  // 1. Fetch User Reports (Subscribed & Merged)
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const q1 = query(collection(db, 'reports'), where('userId', '==', uid));
    const q2 = query(collection(db, 'reports'), where('resolverId', '==', uid));

    let reportsSubmitted: ReportData[] = [];
    let reportsResolved: ReportData[] = [];

    const handleDataMerge = () => {
      const mergedMap = new Map<string, ReportData>();
      reportsSubmitted.forEach(r => mergedMap.set(r.id, r));
      reportsResolved.forEach(r => mergedMap.set(r.id, r));
      
      const merged = Array.from(mergedMap.values());
      // Sort chronologically by pickup date or creation date
      merged.sort((a, b) => {
        const timeA = (a.pickedUpAt?.seconds || a.createdAt?.seconds || 0);
        const timeB = (b.pickedUpAt?.seconds || b.createdAt?.seconds || 0);
        return timeA - timeB;
      });

      setUserReports(merged);
      setLoading(false);
    };

    const unsub1 = onSnapshot(q1, (snapshot) => {
      reportsSubmitted = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReportData));
      handleDataMerge();
    }, (err) => {
      console.error("Firestore error reportsSubmitted:", err);
      setLoading(false);
    });

    const unsub2 = onSnapshot(q2, (snapshot) => {
      reportsResolved = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReportData));
      handleDataMerge();
    }, (err) => {
      console.error("Firestore error reportsResolved:", err);
      setLoading(false);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  // 2. Responsive Sizing (ResizeObserver)
  useEffect(() => {
    if (!barContainerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 280),
          height: 240
        });
      }
    });

    resizeObserver.observe(barContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 3. Compute Metrics
  const getMetrics = () => {
    const uid = auth.currentUser?.uid;

    if (activeTab === 'verified') {
      const resolved = userReports.filter(r => r.resolverId === uid && (r.status === 'Cleaned' || r.status === 'picked_up'));
      const submitted = userReports.filter(r => r.userId === uid);

      // Estimate waste weight mapping
      let wasteRemovedKg = 0;
      resolved.forEach(r => {
        const cat = (r.category || '').toLowerCase();
        if (cat.includes('dumping') || cat.includes('fly')) {
          wasteRemovedKg += 25;
        } else if (cat.includes('pollution') || cat.includes('chemical')) {
          wasteRemovedKg += 12;
        } else if (cat.includes('litter') || cat.includes('bottle')) {
          wasteRemovedKg += 2.5;
        } else {
          wasteRemovedKg += 4.5; // default fallback
        }
      });

      const co2SavedKg = parseFloat((wasteRemovedKg * 1.8).toFixed(1));
      const waterProtectedL = parseFloat((wasteRemovedKg * 75).toFixed(0));

      let communityReach = 0;
      submitted.forEach(r => {
        communityReach += (r.likeCount || 0) + (r.dislikeCount || 0) + 2; // basic base-view weight
      });

      return {
        wasteRemovedKg,
        co2SavedKg,
        waterProtectedL,
        communityReach,
        resolvedCount: resolved.length,
        submittedCount: submitted.length,
        timelineData: resolved.map((r, index) => {
          // Accumulate waste weight
          let cumulativeWeight = 0;
          for (let i = 0; i <= index; i++) {
            const cur = resolved[i];
            const cat = (cur.category || '').toLowerCase();
            if (cat.includes('dumping') || cat.includes('fly')) cumulativeWeight += 25;
            else if (cat.includes('pollution') || cat.includes('chemical')) cumulativeWeight += 12;
            else if (cat.includes('litter') || cat.includes('bottle')) cumulativeWeight += 2.5;
            else cumulativeWeight += 4.5;
          }

          const date = r.pickedUpAt ? new Date(r.pickedUpAt.seconds * 1000) : new Date(r.createdAt?.seconds * 1000 || Date.now());
          return { date, value: cumulativeWeight };
        })
      };
    } else {
      // Projected Simulator metrics (calculated on a monthly timeline)
      const monthlyCleanups = simWeeklyCleanups * 4.3;
      const wasteRemovedKg = parseFloat((monthlyCleanups * simWeightCategory).toFixed(1));
      const co2SavedKg = parseFloat((wasteRemovedKg * 1.8).toFixed(1));
      const waterProtectedL = parseFloat((wasteRemovedKg * 75).toFixed(0));
      const communityReach = parseFloat((monthlyCleanups * 5 * simShareFactor).toFixed(0));

      // Generate a beautiful simulated 4-week timeline for the projection area graph
      const timelineData = Array.from({ length: 5 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (4 - i) * 7);
        const cumulativeWeight = (wasteRemovedKg / 4) * i;
        return { date: d, value: cumulativeWeight };
      });

      return {
        wasteRemovedKg,
        co2SavedKg,
        waterProtectedL,
        communityReach,
        resolvedCount: Math.round(monthlyCleanups),
        submittedCount: Math.round(monthlyCleanups / 2),
        timelineData
      };
    }
  };

  const metrics = getMetrics();

  // 4. Render D3 Charts on Dimensions/Data changes
  useEffect(() => {
    if (!barChartRef.current || !areaChartRef.current) return;

    const margin = { top: 20, right: 25, bottom: 40, left: 105 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    // --- CHART 1: D3 Horizontal Bar Chart ---
    const svgBar = d3.select(barChartRef.current);
    svgBar.selectAll('*').remove();

    const chartData = [
      { label: 'Waste Removed', value: metrics.wasteRemovedKg, unit: ' kg', color: '#10B981', icon: 'Leaf' },
      { label: 'CO₂ Prevented', value: metrics.co2SavedKg, unit: ' kg', color: '#3B82F6', icon: 'Flame' },
      { label: 'Water Saved', value: metrics.waterProtectedL, unit: ' L', color: '#06B6D4', icon: 'Droplet' },
      { label: 'Community Reach', value: metrics.communityReach, unit: ' pts', color: '#F59E0B', icon: 'Users' }
    ];

    const gBar = svgBar
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.value) || 10])
      .range([0, width]);

    const yScale = d3.scaleBand()
      .domain(chartData.map(d => d.label))
      .range([0, height])
      .padding(0.35);

    // Add Gridlines
    gBar.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0, ${height})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(5)
          .tickSize(-height)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#27272a')
      .attr('stroke-dasharray', '2,2');

    // Draw Bars with beautiful smooth transition
    gBar.selectAll('.bar')
      .data(chartData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('y', d => yScale(d.label) || 0)
      .attr('x', 0)
      .attr('height', yScale.bandwidth())
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', d => d.color)
      .attr('opacity', 0.85)
      .transition()
      .duration(700)
      .attr('width', d => xScale(d.value));

    // Y Axis Labels
    gBar.append('g')
      .call(d3.axisLeft(yScale).tickSize(0))
      .selectAll('text')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('fill', '#a1a1aa')
      .style('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .attr('dx', '-10px');

    // Remove axis outline lines
    gBar.selectAll('.domain').remove();

    // Value Labels on inside/end of bars
    gBar.selectAll('.value-label')
      .data(chartData)
      .enter()
      .append('text')
      .attr('class', 'value-label')
      .attr('y', d => (yScale(d.label) || 0) + yScale.bandwidth() / 2 + 3.5)
      .attr('x', d => Math.max(xScale(d.value) + 5, 5))
      .attr('fill', '#ffffff')
      .attr('font-size', '10px')
      .attr('font-weight', '800')
      .style('font-family', 'monospace')
      .text(d => `${d.value.toLocaleString()}${d.unit}`);


    // --- CHART 2: D3 Timeline Area Chart ---
    const svgArea = d3.select(areaChartRef.current);
    svgArea.selectAll('*').remove();

    const gArea = svgArea
      .append('g')
      .attr('transform', `translate(${margin.left - 20}, ${margin.top})`);

    const hasTimeline = metrics.timelineData.length > 0;
    const timeline = hasTimeline 
      ? metrics.timelineData 
      : [{ date: new Date(), value: 0 }];

    const xAreaScale = d3.scaleTime()
      .domain(d3.extent(timeline, d => d.date) as [Date, Date])
      .range([0, width + 20]);

    const yAreaScale = d3.scaleLinear()
      .domain([0, (d3.max(timeline, d => d.value) || 10) * 1.15])
      .range([height, 0]);

    // Gridlines for Area Chart
    gArea.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(
        d3.axisBottom(xAreaScale)
          .ticks(4)
          .tickSize(-height)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#27272a')
      .attr('stroke-dasharray', '2,2');

    gArea.append('g')
      .call(
        d3.axisLeft(yAreaScale)
          .ticks(4)
          .tickSize(-(width + 20))
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#27272a')
      .attr('stroke-dasharray', '2,2');

    // Area Generator
    const areaGenerator = d3.area<any>()
      .x(d => xAreaScale(d.date))
      .y0(height)
      .y1(d => yAreaScale(d.value))
      .curve(d3.curveMonotoneX);

    // Line Generator
    const lineGenerator = d3.line<any>()
      .x(d => xAreaScale(d.date))
      .y(d => yAreaScale(d.value))
      .curve(d3.curveMonotoneX);

    // Color Gradients inside SVG Area Chart
    const defs = svgArea.append('defs');
    const areaGrad = defs.append('linearGradient')
      .attr('id', 'area-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGrad.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#10B981')
      .attr('stop-opacity', 0.25);

    areaGrad.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#10B981')
      .attr('stop-opacity', 0.0);

    // Draw Area with smooth animation
    const pathArea = gArea.append('path')
      .datum(timeline)
      .attr('fill', 'url(#area-grad)')
      .attr('d', areaGenerator);

    // Draw Line
    gArea.append('path')
      .datum(timeline)
      .attr('fill', 'none')
      .attr('stroke', '#10B981')
      .attr('stroke-width', 2.5)
      .attr('d', lineGenerator);

    // X Axis ticks
    gArea.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xAreaScale).ticks(3).tickSize(4))
      .selectAll('text')
      .attr('font-size', '9px')
      .attr('fill', '#71717a')
      .style('font-family', 'ui-sans-serif, system-ui, sans-serif');

    // Y Axis ticks
    gArea.append('g')
      .call(d3.axisLeft(yAreaScale).ticks(4).tickSize(4))
      .selectAll('text')
      .attr('font-size', '9px')
      .attr('fill', '#71717a')
      .style('font-family', 'monospace');

    // Remove domain lines
    gArea.selectAll('.domain').remove();

    // Data points circles
    gArea.selectAll('.dot')
      .data(timeline)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xAreaScale(d.date))
      .attr('cy', d => yAreaScale(d.value))
      .attr('r', 4)
      .attr('fill', '#10B981')
      .attr('stroke', '#09090b')
      .attr('stroke-width', 1.5);

  }, [dimensions, metrics]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-3xl shadow-3xl space-y-6">
      {/* Visual Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Leaf size={18} className="text-primary animate-pulse" />
            Ecological Impact Ledger
          </h3>
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1">
            Dynamic D3 environmental impact analytics
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-zinc-950 p-1.5 rounded-xl border border-zinc-800/80 shrink-0">
          <button
            onClick={() => setActiveTab('verified')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'verified'
                ? 'bg-zinc-850 text-white border border-zinc-800'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Verified Record
          </button>
          <button
            onClick={() => setActiveTab('projection')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'projection'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Sparkles size={11} />
            Projection Planner
          </button>
        </div>
      </div>

      {/* Main Grid: Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-850">
          <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Litter Cleared</p>
          <p className="text-2xl font-black text-emerald-500 mt-1">{metrics.wasteRemovedKg} <span className="text-[10px] text-zinc-500">KG</span></p>
          <p className="text-[8px] text-zinc-600 uppercase tracking-wider mt-0.5">Est. net weight</p>
        </div>

        <div className="bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-850">
          <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest font-mono">CO₂ Prevented</p>
          <p className="text-2xl font-black text-blue-500 mt-1">{metrics.co2SavedKg} <span className="text-[10px] text-zinc-500">KG</span></p>
          <p className="text-[8px] text-zinc-600 uppercase tracking-wider mt-0.5">Methane & decay avoid</p>
        </div>

        <div className="bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-850">
          <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Aquatic Protection</p>
          <p className="text-2xl font-black text-cyan-500 mt-1">{metrics.waterProtectedL} <span className="text-[10px] text-zinc-500">L</span></p>
          <p className="text-[8px] text-zinc-600 uppercase tracking-wider mt-0.5">Leachate runoff shielded</p>
        </div>

        <div className="bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-850">
          <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Community Reach</p>
          <p className="text-2xl font-black text-amber-500 mt-1">{metrics.communityReach} <span className="text-[10px] text-zinc-500">pts</span></p>
          <p className="text-[8px] text-zinc-600 uppercase tracking-wider mt-0.5">Ecology awareness multiplier</p>
        </div>
      </div>

      {/* Projection Simulator Slider Drawer */}
      <AnimatePresence>
        {activeTab === 'projection' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-zinc-950/70 border border-zinc-800 p-4 md:p-6 rounded-2xl space-y-4"
          >
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" />
              <h4 className="text-xs font-black text-white uppercase tracking-tight">Simulator Configuration</h4>
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Adjust sliders below to project your ecological potential and visualize environmental contribution milestones in the graphs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* Sliders */}
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-mono uppercase font-bold">
                  <span className="text-zinc-500">Cleanups / Week</span>
                  <span className="text-primary">{simWeeklyCleanups} targets</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="1"
                  value={simWeeklyCleanups}
                  onChange={(e) => setSimWeeklyCleanups(Number(e.target.value))}
                  className="w-full accent-primary bg-zinc-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-mono uppercase font-bold">
                  <span className="text-zinc-500">Avg. Waste Size per site</span>
                  <span className="text-primary">
                    {simWeightCategory === 2.5 ? 'Small (~2.5kg)' : simWeightCategory === 5 ? 'Medium (~5kg)' : simWeightCategory === 12 ? 'Heavy (~12kg)' : 'Large Fly-tipping (~25kg)'}
                  </span>
                </div>
                <select
                  value={simWeightCategory}
                  onChange={(e) => setSimWeightCategory(Number(e.target.value))}
                  className="w-full bg-zinc-900 text-xs text-white border border-zinc-800 rounded-xl p-2 outline-none focus:border-primary/50"
                >
                  <option value="2.5">Small Scale (Litter bags, recyclables) ~2.5 kg</option>
                  <option value="5">Medium Scale (Binned sacks, scattered trash) ~5 kg</option>
                  <option value="12">Heavy Duty (Metals, tires, streams) ~12 kg</option>
                  <option value="25">Max Scale (Illegal fly-tipping heap) ~25 kg</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-mono uppercase font-bold">
                  <span className="text-zinc-500">Awareness Share Multiplier</span>
                  <span className="text-primary">{simShareFactor}x exposure</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={simShareFactor}
                  onChange={(e) => setSimShareFactor(Number(e.target.value))}
                  className="w-full accent-primary bg-zinc-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State warning for Real Data */}
      {activeTab === 'verified' && userReports.length === 0 && (
        <div className="bg-zinc-950/40 p-8 rounded-2xl border border-dashed border-zinc-800 text-center space-y-3">
          <p className="text-sm font-bold text-zinc-400">Your Verified Impact Ledger is empty.</p>
          <p className="text-[11px] text-zinc-600 max-w-md mx-auto leading-relaxed">
            You haven't resolved any local litter sighting reports or submitted proof of pickup yet. Open the feed tab, locate a local litter spot, pick it up, and submit photo proof to build your ledger!
          </p>
          <button
            onClick={() => setActiveTab('projection')}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <Sparkles size={12} className="text-primary" />
            Try the Projection Planner instead
          </button>
        </div>
      )}

      {/* D3 Visualizations Stage Grid */}
      <div className={`grid grid-cols-1 ${activeTab === 'verified' && userReports.length === 0 ? 'hidden' : 'md:grid-cols-2'} gap-6`}>
        {/* Metric breakdown chart */}
        <div ref={barContainerRef} className="bg-zinc-950/30 border border-zinc-850 rounded-2xl p-4 flex flex-col items-center">
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono self-start mb-2">Metrics Proportion Breakdown</p>
          <svg
            ref={barChartRef}
            width={dimensions.width}
            height={dimensions.height}
            className="w-full h-auto overflow-visible"
          />
        </div>

        {/* Timeline area chart */}
        <div ref={areaContainerRef} className="bg-zinc-950/30 border border-zinc-850 rounded-2xl p-4 flex flex-col items-center">
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono self-start mb-2">Cumulative Waste Prevented (KG)</p>
          <svg
            ref={areaChartRef}
            width={dimensions.width}
            height={dimensions.height}
            className="w-full h-auto overflow-visible"
          />
        </div>
      </div>
    </div>
  );
};
