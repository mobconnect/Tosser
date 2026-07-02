import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertOctagon, Phone, Globe, ShieldAlert, X, ChevronRight, CheckCircle, Info } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { cn } from '../lib/utils';

interface EmergencyContact {
  authority: string;
  phone: string;
  website: string;
  description: string;
  guidelines: string[];
}

const EMERGENCY_CONTACTS: Record<string, EmergencyContact> = {
  US: {
    authority: 'Environmental Protection Agency (EPA) National Response Center',
    phone: '1-800-424-8802',
    website: 'https://www.epa.gov/report-violation',
    description: 'Call immediately to report chemical releases, oil spills, toxic waste dumping, or severe environmental hazards in the United States.',
    guidelines: [
      'Do not touch or inhale any unfamiliar liquid or chemical spill.',
      'Document the exact geographic coordinates or closest physical address.',
      'Take photos from a safe distance before calling authorities.',
    ],
  },
  CA: {
    authority: 'Environment and Climate Change Canada (ECCC)',
    phone: '1-800-668-6767',
    website: 'https://www.canada.ca/en/environment-climate-change.html',
    description: 'Federal helpline for Canadian environmental emergencies, active toxic dumpings, or dangerous wildlife habitat destruction.',
    guidelines: [
      'Identify the volume and type of waste or pollutant if safe to do so.',
      'Keep children and pets away from the contaminated perimeter.',
      'Submit visual proof to provincial eco-officers immediately.',
    ],
  },
  GB: {
    authority: 'UK Environment Agency Incident Hotline',
    phone: '0800 80 70 60',
    website: 'https://www.gov.uk/report-an-environmental-incident',
    description: 'Report illegal waste sites, industrial pollution events, blockages causing flooding, or river contamination in the United Kingdom.',
    guidelines: [
      'Keep track of ongoing discharge rates (e.g., pipe leaking into water).',
      'Provide details on whether wildlife or livestock are affected.',
      'Do not attempt to obstruct or clean up industrial chemical spills yourself.',
    ],
  },
  AU: {
    authority: 'Australia Environmental Protection Authority (EPA)',
    phone: '131 555',
    website: 'https://www.epa.nsw.gov.au/reporting-and-incidents/report-pollution',
    description: 'State and national EPA hotlines to log active illegal dumping, land pollution, or water system contamination.',
    guidelines: [
      'Note vehicle license plates if witnessing active dumping.',
      'Advise if the dump is on public reserve or protected land.',
      'Observe wind direction to avoid inhaling potentially toxic vapor.',
    ],
  },
  DE: {
    authority: 'Umweltbundesamt (Federal Environment Agency Germany)',
    phone: '+49-30-18305-0',
    website: 'https://www.umweltbundesamt.de/',
    description: 'Official portal for reporting severe industrial pollution, illegal soil contamination, and ecological emergency concerns in Germany.',
    guidelines: [
      'Contact local police (110) or fire department (112) for immediate hazards.',
      'Provide clear description of substance states (liquids, solids, barrels).',
      'Obtain water sample references only if trained and equipped.',
    ],
  },
  FR: {
    authority: 'Ministère de la Transition écologique (French Eco-Alert)',
    phone: '112',
    website: 'https://www.ecologie.gouv.fr/',
    description: 'Use the universal European emergency hotline for immediate chemical disasters or report environmental misconduct to local authorities.',
    guidelines: [
      'Indicate exact location coordinates or use standard landmarks.',
      'Avoid touch contact with industrial barrels or medical waste.',
      'Upload geolocated photo evidence directly to local Gendarmerie.',
    ],
  },
  ES: {
    authority: 'Ministerio para la Transición Ecológica y el Reto Demográfico',
    phone: '+34-91-597-60-00',
    website: 'https://www.miteco.gob.es/',
    description: 'Contact lines for severe soil degradation, illegal hazardous waste burying, or industrial spill emergency responses in Spain.',
    guidelines: [
      'Evite la inhalación de gases o humos procedentes de vertidos.',
      'Registre matrículas o señas de infractores si es posible.',
      'Informe de inmediato a los agentes forestales de la zona (SEPRONA).',
    ],
  },
  IT: {
    authority: 'Carabinieri per la Tutela Ambientale (CTA) & Noe',
    phone: '1515',
    website: 'https://www.mase.gov.it/',
    description: 'Direct national environmental emergency line of the Italian Carabinieri to report environmental disasters, illegal dumping, and eco-mafia crimes.',
    guidelines: [
      'Fornire dettagli precisi sul tipo di rifiuto (pericoloso, chimico, amianto).',
      'Mantenersi a distanza di sicurezza per evitare contaminazioni cutanee.',
      'Documentare la targa di eventuali veicoli coinvolti nello sversamento.',
    ],
  },
  JP: {
    authority: 'Ministry of the Environment (Japan) Emergency Center',
    phone: '+81-3-3581-3351',
    website: 'https://www.env.go.jp/',
    description: 'Line for reporting critical marine spills, illegal chemical disposals, or severe commercial dumping offenses in Japan.',
    guidelines: [
      '安全な距離を保ち、目や皮膚への接触を避けてください。',
      '不法投棄車両のナンバープレートや特徴を記録してください。',
      '可能であれば、スマートフォン等で安全な場所から撮影してください。',
    ],
  },
  CN: {
    authority: 'Ministry of Ecology and Environment Hotline (China)',
    phone: '12369',
    website: 'http://www.mee.gov.cn/',
    description: 'National 12369 Environmental Reporting Hotline for reporting illegal emissions, toxic dumping, and chemical spills in China.',
    guidelines: [
      '立即拨打12369环保热线进行报案。',
      '提供违法排污或倾倒废物的精确物理位置。',
      '切勿靠近不明气味或带有腐蚀性标示的塑料桶和铁桶。',
    ],
  },
  IN: {
    authority: 'Central Pollution Control Board (CPCB) India',
    phone: '+91-11-43102030',
    website: 'https://cpcb.nic.in/',
    description: 'Federal agency to contact regarding heavy river waste dumping, severe particulate matter release, or unsafe industrial chemical disposals.',
    guidelines: [
      'Report immediately to prevent toxins from reaching local water supplies.',
      'Inform the municipal corporation or local police department.',
      'Never touch or attempt to ignite dumped waste piles.',
    ],
  },
};

const DEFAULT_CONTACT: EmergencyContact = {
  authority: 'Local Environmental Protection & Waste Authority',
  phone: 'Emergency Services (911 / 112)',
  website: 'https://www.unep.org/',
  description: 'No country-specific helpline configured. Please contact your local municipal environmental protection office or local emergency rescue services.',
  guidelines: [
    'Observe safety protocols: do not approach or touch unknown hazardous liquids, toxic sludge, or medical waste.',
    'Observe vehicles or individuals conducting illegal dumpings and write down identifiers.',
    'Log a detailed report with GPS coordinates inside our app to warn other local cleanup volunteers.',
  ],
};

export const EnvironmentalEmergencyButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { country } = useLanguage();

  const currentContact = EMERGENCY_CONTACTS[country] || DEFAULT_CONTACT;

  return (
    <>
      {/* Red Alert Styled Emergency Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="group relative flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border-2 border-rose-500/40 hover:border-rose-500 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.1)] active:scale-95 select-none"
      >
        <AlertOctagon size={14} className="animate-pulse text-rose-500" />
        <span>Eco Emergency</span>
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
        </span>
      </button>

      {/* Emergency Contact Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Dark blur backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-zinc-950 border-2 border-rose-500/50 rounded-[2rem] overflow-hidden shadow-2xl relative"
                style={{
                  boxShadow: '0 20px 50px -15px rgba(244,63,94,0.25), 0 0 1px 1px rgba(244,63,94,0.1)'
                }}
              >
                {/* Header Section */}
                <div className="bg-gradient-to-r from-rose-950/40 via-rose-900/10 to-transparent border-b border-rose-950 p-6 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-500">
                      <ShieldAlert size={22} className="animate-bounce" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">
                        Environmental Incident Response
                      </h3>
                      <p className="text-[10px] text-rose-400/80 font-mono uppercase tracking-widest mt-0.5">
                        Selected Country: {country}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full border border-zinc-800 transition-all cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-6 md:p-8 space-y-6">
                  {/* Warning Box */}
                  <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-4 flex gap-3.5 items-start">
                    <Info size={16} className="text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-200/90 leading-relaxed">
                      If you witness active chemical spills, toxic gas discharge, or illegal burial of medical/commercial hazardous waste, do not attempt to touch or cleanup yourself. Keep a safe distance and alert the proper authorities immediately.
                    </p>
                  </div>

                  {/* Contact Card */}
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
                    <div>
                      <p className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest">
                        Designated Authority
                      </p>
                      <h4 className="text-lg font-bold text-white mt-1">
                        {currentContact.authority}
                      </h4>
                      <p className="text-xs text-zinc-400 leading-relaxed mt-2 font-medium">
                        {currentContact.description}
                      </p>
                    </div>

                    {/* Interaction Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <a
                        href={`tel:${currentContact.phone.replace(/[^0-9+]/g, '')}`}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-rose-500 hover:bg-rose-600 text-black font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                      >
                        <Phone size={14} />
                        <span>Call Authority</span>
                      </a>
                      <a
                        href={currentContact.website}
                        target="_blank"
                        rel="noreferrer referrer"
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <Globe size={14} />
                        <span>Report Online</span>
                      </a>
                    </div>
                  </div>

                  {/* Safety & Evidence Guidelines */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                      Emergency Spill & Hazard Guidelines
                    </p>
                    <ul className="space-y-2.5">
                      {currentContact.guidelines.map((line, idx) => (
                        <li key={idx} className="flex gap-2.5 items-start text-xs text-zinc-400">
                          <ChevronRight size={14} className="text-rose-500 shrink-0 mt-0.5" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer status bar */}
                <div className="bg-zinc-900 p-4 border-t border-zinc-850 flex items-center justify-between text-[10px] text-zinc-500">
                  <span className="font-mono uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle size={10} className="text-primary" /> Authority Database v1.4
                  </span>
                  <span>Dial-Ready</span>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
