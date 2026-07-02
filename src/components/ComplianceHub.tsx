import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Scale, AlertTriangle, BookOpen, ChevronDown, CheckCircle2, FileText, Info } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { COUNTRIES } from '../lib/countries';

export const ComplianceHub: React.FC = () => {
  const { country } = useLanguage();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const activeCountryName = COUNTRIES.find((c) => c.code === country)?.name || 'Global Region';

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  // Dynamic Country Legislative Data mapped for compliance
  const getCountryLegislation = (code: string) => {
    switch (code) {
      case 'US':
        return {
          actName: 'Resource Conservation and Recovery Act (RCRA) & EPA Guidelines',
          regulatoryBody: 'United States Environmental Protection Agency (EPA)',
          statute: '42 U.S.C. §6901 et seq.',
          description: 'Governs the generation, transportation, treatment, storage, and disposal of solid and hazardous waste. In the United States, fly-tipping and littering are subject to state-level penalties, environmental fines, and community service mandates.',
          requirements: [
            'Illegal waste disposal (RCRA Subtitle D) is prohibited on public and federal lands.',
            'Hazardous wastes require disposal only at permitted RCRA Subtitle C treatment facilities.',
            'State littering acts (e.g., California Penal Code 374.3) impose heavy civil assessments.'
          ]
        };
      case 'GB':
        return {
          actName: 'Environmental Protection Act 1990 (Section 87/88) & Clean Neighbourhoods Act',
          regulatoryBody: 'Department for Environment, Food & Rural Affairs (DEFRA)',
          statute: 'EPA 1990 c. 43 Part III/IV',
          description: 'Establishes statutory duty of care for waste management. Fly-tipping (Section 33) is a serious criminal offense carrying unlimited fines and imprisonment.',
          requirements: [
            'Fixed Penalty Notices (FPNs) may be issued under Section 88 for minor litter offenses.',
            'Duty of Care requires transfer of waste only to authorized, registered waste carriers.',
            'Strict local authority powers to clean land and recover costs from perpetrators.'
          ]
        };
      case 'DE':
        return {
          actName: 'Kreislaufwirtschaftsgesetz (KrWG) - Circular Economy Act',
          regulatoryBody: 'Bundesministerium für Umwelt, Naturschutz und nukleare Sicherheit (BMUV)',
          statute: 'KrWG BGBI. I S. 212',
          description: 'Promotes waste avoidance, recovery, and closed-loop recycling. Unlawful dumping of domestic or hazardous rubbish outside of certified recycling centers (Wertstoffhof) is strictly penalized.',
          requirements: [
            'Product responsibility principles require manufacturers to manage end-of-life cycles.',
            'Strict segregation of organic, recyclable, hazardous, and bulk materials is mandatory.',
            'Fines under local municipal waste statutes (Abfallsatzung) for unauthorized garbage deposits.'
          ]
        };
      case 'FR':
        return {
          actName: 'Code de l\'environnement & Loi Anti-Gaspillage (AGEC)',
          regulatoryBody: 'Ministère de la Transition Écologique',
          statute: 'Loi n° 2020-105 (AGEC) / Art. R632-1 & R635-8',
          description: 'Aims to eliminate single-use plastics and regulate illegal dumping. Abandoning waste on public spaces or pathways triggers standard contravention citations and vehicle impoundment capabilities.',
          requirements: [
            'Prohibitions on throwing or abandoning any object, waste, or fluid in public spaces.',
            'Extended Producer Responsibility (REP) systems manage bulk recycling streams.',
            'Fines up to €1,500 for dumping waste using a vehicle (Article R635-8).'
          ]
        };
      case 'ES':
        return {
          actName: 'Ley 7/2022 de Residuos y Suelos Contaminados para una Economía Circular',
          regulatoryBody: 'Ministerio para la Transición Ecológica y el Reto Demográfico',
          statute: 'BOE-A-2022-5855',
          description: 'Regulates waste minimization, packaging limits, and illegal landfills. Establishes clear regional and municipal duties to police and remediate abandoned waste sites.',
          requirements: [
            'Absolute prohibition of uncontrolled dumping or abandoning of municipal solid waste.',
            'Local councils must charge waste-management tariffs based on production volume.',
            'Fines up to €2,000 for minor littering and up to €100,000 for severe unauthorized dumping.'
          ]
        };
      case 'CN':
        return {
          actName: '中华人民共和国固体废物污染环境防治法 (Solid Waste Pollution Law)',
          regulatoryBody: '中华人民共和国生态环境部 (Ministry of Ecology and Environment)',
          statute: 'Standing Committee of NPC Decree No. 43',
          description: 'Governs national solid waste management, municipal classification, and the prohibition of imported waste. Enforces severe corporate and individual accountability for environmental damage.',
          requirements: [
            'Mandatory household waste classification and sorting compliance under urban regulations.',
            'Severe civil fines for industrial and construction debris dumped near rivers or reserves.',
            'Criminal prosecution for illegal discharge, dumping, or treatment of toxic waste substances.'
          ]
        };
      case 'PH':
        return {
          actName: 'Republic Act No. 9003 - Ecological Solid Waste Management Act of 2000',
          regulatoryBody: 'National Solid Waste Management Commission (NSWMC) / DENR',
          statute: 'RA 9003 Legislative Act',
          description: 'Provides the systematic framework for ecological solid waste management in the Philippines, mandating waste segregation at the Barangay level.',
          requirements: [
            'Littering, throwing, and dumping of waste materials in public places are explicitly prohibited (Sec. 48).',
            'Local Government Units (LGUs) are legally responsible for building Material Recovery Facilities (MRFs).',
            'Violators face fines, community clean-up service, and summary citation notices.'
          ]
        };
      case 'IT':
        return {
          actName: 'Decreto Legislativo 3 aprile 2006, n. 152 (Testo Unico Ambientale)',
          regulatoryBody: 'Ministero dell\'Ambiente e della Sicurezza Energetica',
          statute: 'D.Lgs. n. 152/2006 Art. 192/255',
          description: 'Prohibits the uncontrolled dumping and abandonment of waste on or in the soil. Mandates the restoration of sites by the liable parties, including property owners if complicit.',
          requirements: [
            'Littering of small waste items (Article 232-ter) carries specific monetary fines.',
            'Dumping by business entities constitutes a criminal offense (Article 256).',
            'Mayors hold statutory authority to order immediate cleanup and recovery of costs.'
          ]
        };
      case 'JP':
        return {
          actName: '廃棄物の処理及び清掃に関する法律 (Waste Management & Cleansing Law)',
          regulatoryBody: '環境省 (Ministry of the Environment)',
          statute: 'Act No. 137 of 1970',
          description: 'Regulates waste emissions, domestic sanitation, and strictly prohibits the act of illegal dumping (Fuhou-touki), imposing harsh penalties on corporate and private violators.',
          requirements: [
            'Illegal dumping carries severe penalties, including prison sentences up to 5 years or individual fines up to ¥10 million.',
            'Strict adherence to municipal waste disposal separation calendars and rules is legally expected.',
            'Home appliance recycling acts enforce structured product handovers for electronics.'
          ]
        };
      case 'PT':
        return {
          actName: 'Regime Geral de Gestão de Resíduos (RGGR)',
          regulatoryBody: 'Agência Portuguesa do Ambiente (APA)',
          statute: 'Decreto-Lei n.º 102-D/2020',
          description: 'Regulates waste operations, circular resource streams, and littering offenses within Portuguese territory.',
          requirements: [
            'Strict administrative offenses (contraordenações) for depositing waste in unauthorized locations.',
            'Mandatory licensing for commercial transport or storage of industrial and construction wastes.',
            'Municipalities hold police authority to ticket and process localized littering offenses.'
          ]
        };
      case 'IN':
        return {
          actName: 'Solid Waste Management Rules, 2016 & Swachh Bharat Guidelines',
          regulatoryBody: 'Ministry of Environment, Forest and Climate Change (MoEFCC)',
          statute: 'S.O. 1357(E) Environmental Protection Act',
          description: 'Mandates the segregation of waste at source into wet, dry, and domestic hazardous streams, promoting safe community compost and recycling structures.',
          requirements: [
            'Source segregation is legally binding on all waste generators including households.',
            'No waste generator shall throw, burn, or bury solid waste on open streets or public spaces.',
            'User fees and spot fines are authorized for municipalities to enforce clean public zones.'
          ]
        };
      case 'ZA':
        return {
          actName: 'National Environmental Management: Waste Act (NEMWA), 2008',
          regulatoryBody: 'Department of Forestry, Fisheries and the Environment (DFFE)',
          statute: 'Act No. 59 of 2008',
          description: 'Reformulates national waste licensing, storage rules, and contamination standards. Promotes waste reduction and enforces duty of care across all South African provinces.',
          requirements: [
            'No person may litter or dump waste in any public area or municipal land.',
            'Requires strict license registration for any waste recovery or treatment facility.',
            'Empowers environmental management inspectors (Green Scorpions) to issue compliance notices.'
          ]
        };
      default:
        return {
          actName: 'Universal Municipal Environmental Codes & Duty of Care',
          regulatoryBody: 'Local Municipal Environmental and Public Health Authorities',
          statute: 'General Local Sanitation Ordinances',
          description: 'Establishes the community standard for sanitation and public hygiene. Safe disposal of household waste is universally regulated to prevent vector-borne disease and soil contamination.',
          requirements: [
            'Littering and fly-tipping are prohibited under general public health codes.',
            'Citizens are legally expected to utilize designated civic waste containment systems.',
            'Unresolved waste piles should be reported to municipal authorities for expert clearance.'
          ]
        };
    }
  };

  const localLegislation = getCountryLegislation(country);

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 p-6 md:p-8 rounded-3xl space-y-6">
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
        <ShieldCheck className="text-primary animate-pulse" size={22} />
        <div>
          <h3 className="text-md font-black text-white uppercase tracking-tight">Regulatory Compliance & Licensing</h3>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Verified environmental regulations and safety mandates</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Accordion 1: WHO Safety Mandate & Hazard Controls */}
        <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/40">
          <button
            onClick={() => toggleSection('who')}
            className="w-full flex items-center justify-between p-4 text-left transition-all hover:bg-zinc-900/40 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={15} className="text-amber-500 shrink-0" />
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">WHO Health & Safety Mandates</span>
            </div>
            <ChevronDown
              size={14}
              className={`text-zinc-500 transition-transform ${expandedSection === 'who' ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {expandedSection === 'who' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 border-t border-zinc-900 space-y-3 text-[11px] text-zinc-400 leading-relaxed">
                  <p className="font-semibold text-zinc-300">
                    Pursuant to World Health Organization (WHO) Guidelines on Community Sanitation and Hazardous Waste Controls:
                  </p>
                  
                  <div className="space-y-2.5 bg-zinc-950/70 p-3 rounded-xl border border-zinc-850">
                    <div className="flex gap-2">
                      <CheckCircle2 size={13} className="text-primary shrink-0 mt-0.5" />
                      <span><strong>Personal Protective Equipment (PPE):</strong> Always wear thick safety gloves, closed-toe protective footwear, and use pick-up tongs when clearing debris.</span>
                    </div>
                    <div className="flex gap-2">
                      <CheckCircle2 size={13} className="text-red-500 shrink-0 mt-0.5" />
                      <span><strong>Biohazard & Chemical Controls:</strong> Strictly DO NOT touch or attempt to pick up medical waste, syringes, animal carcasses, asbestos, batteries, or industrial chemicals. Report these immediately to local health services.</span>
                    </div>
                    <div className="flex gap-2">
                      <CheckCircle2 size={13} className="text-primary shrink-0 mt-0.5" />
                      <span><strong>Hand Hygiene:</strong> Wash hands thoroughly with soap and water or use an alcohol-based rub immediately after handling any environmental waste.</span>
                    </div>
                  </div>

                  <p className="text-[10px] italic text-zinc-500">
                    References: WHO Sanitation Safety Planning (SSP) manual & WHO Global Strategy on Health, Environment and Climate Change.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Accordion 2: Country Legislative Compliance */}
        <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/40">
          <button
            onClick={() => toggleSection('legislation')}
            className="w-full flex items-center justify-between p-4 text-left transition-all hover:bg-zinc-900/40 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Scale size={15} className="text-primary shrink-0" />
              <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                {activeCountryName} Environmental Legislation
              </span>
            </div>
            <ChevronDown
              size={14}
              className={`text-zinc-500 transition-transform ${expandedSection === 'legislation' ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {expandedSection === 'legislation' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 border-t border-zinc-900 space-y-3 text-[11px] text-zinc-400 leading-relaxed">
                  <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-850 space-y-2">
                    <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-wider">Act / Regulation Name:</p>
                    <p className="text-white font-bold text-xs">{localLegislation.actName}</p>
                    
                    <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider mt-2">Regulatory Body & Statute:</p>
                    <p className="text-zinc-300 font-medium">{localLegislation.regulatoryBody} <span className="text-[10px] font-mono text-primary font-bold">({localLegislation.statute})</span></p>
                    
                    <p className="text-zinc-400 text-[11px] leading-relaxed mt-2 pt-2 border-t border-zinc-900">
                      {localLegislation.description}
                    </p>
                  </div>

                  <p className="font-semibold text-zinc-300 uppercase text-[9px] tracking-wider pt-1">Strict Requirements & Compliance Standards:</p>
                  <ul className="space-y-1.5 pl-1">
                    {localLegislation.requirements.map((req, i) => (
                      <li key={i} className="flex gap-2 items-start">
                        <span className="text-primary font-bold font-mono text-[10px] mt-0.5">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Accordion 3: Open-Source Licensing & Copyright Attributions */}
        <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/40">
          <button
            onClick={() => toggleSection('licensing')}
            className="w-full flex items-center justify-between p-4 text-left transition-all hover:bg-zinc-900/40 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <BookOpen size={15} className="text-zinc-400 shrink-0" />
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">Copyright & Software Attributions</span>
            </div>
            <ChevronDown
              size={14}
              className={`text-zinc-500 transition-transform ${expandedSection === 'licensing' ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {expandedSection === 'licensing' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 border-t border-zinc-900 space-y-3 text-[11px] text-zinc-400 leading-relaxed">
                  <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-850 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold uppercase text-[9px] tracking-wider font-mono">Software License</span>
                      <span className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded font-mono font-black text-[9px]">APACHE-2.0</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      This application code is open-source and licensed under the <strong>Apache License, Version 2.0</strong> (the &quot;License&quot;). You may obtain a copy of the License at <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">apache.org/licenses/LICENSE-2.0</a>.
                    </p>
                  </div>

                  <p className="font-semibold text-zinc-300 uppercase text-[9px] tracking-wider pt-1">Component & Dataset Attributions:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                    <div className="p-2 bg-zinc-950/50 rounded-lg border border-zinc-850">
                      <strong className="text-white">D3.js Visualization:</strong>
                      <p className="text-zinc-500">Copyright Mike Bostock. BSD-3-Clause license.</p>
                    </div>
                    <div className="p-2 bg-zinc-950/50 rounded-lg border border-zinc-850">
                      <strong className="text-white">Lucide Icons:</strong>
                      <p className="text-zinc-500">Copyright Lucide Contributors. ISC license.</p>
                    </div>
                    <div className="p-2 bg-zinc-950/50 rounded-lg border border-zinc-850">
                      <strong className="text-white">Recharts Charts:</strong>
                      <p className="text-zinc-500">Copyright Recharts Authors. MIT license.</p>
                    </div>
                    <div className="p-2 bg-zinc-950/50 rounded-lg border border-zinc-850">
                      <strong className="text-white">OpenStreetMap Geospatial:</strong>
                      <p className="text-zinc-500">© OpenStreetMap contributors, ODbL.</p>
                    </div>
                  </div>

                  <p className="text-[9px] text-zinc-500 text-center pt-2">
                    Copyright © {new Date().getFullYear()} Tosser Project. All environmental resistance rights reserved.
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
