import React, { useState } from 'react';
import { ArrowRight, Globe, Map } from 'lucide-react';
import NetworkBackground from './NetworkBackground';
import InputWizard from './InputWizard';
import { JourneyData } from '../types';

interface LandingPageProps {
  onJourneyStart: (data: JourneyData) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onJourneyStart }) => {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <div className="relative min-h-screen bg-biblio-light text-biblio-green overflow-hidden font-sans flex flex-col">
      {/* Header */}
      <header className="w-full p-8 flex justify-between items-center z-20">
        <div className="text-3xl font-bold tracking-tighter font-serif">
          reading.map
        </div>
        <div className="text-sm font-sans font-medium opacity-80 hidden md:block tracking-widest">
          2025 年度阅读足迹可视化
        </div>
        <div className="flex gap-4 text-sm font-sans md:hidden">
          <span>2025</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow relative flex flex-col justify-center items-center z-10 w-full px-6">
        
        {/* Decorative Icons */}
        <div className="absolute top-20 left-10 opacity-20 hidden md:block animate-pulse">
           <Map size={48} strokeWidth={1} />
        </div>
        <div className="absolute bottom-20 right-10 opacity-20 hidden md:block animate-pulse" style={{ animationDelay: '1s'}}>
           <Globe size={48} strokeWidth={1} />
        </div>

        {/* Hero Text */}
        <div className="w-full max-w-5xl flex flex-col items-start md:items-center text-left md:text-center mt-[-10vh]">
          
          <h1 className="text-5xl md:text-8xl lg:text-9xl font-bold font-serif tracking-tight mb-8 fade-in text-biblio-green">
            <span className="inline-block hover:scale-105 transition-transform duration-700 cursor-default">以</span>
            <span className="inline-block hover:scale-105 transition-transform duration-700 cursor-default">书</span>
            <span className="inline-block mx-4 md:mx-8 italic font-light opacity-50 text-4xl md:text-7xl align-middle">x</span>
            <span className="inline-block hover:scale-105 transition-transform duration-700 cursor-default">丈</span>
            <span className="inline-block hover:scale-105 transition-transform duration-700 cursor-default">量</span>
            <span className="inline-block hover:scale-105 transition-transform duration-700 cursor-default">世</span>
            <span className="inline-block hover:scale-105 transition-transform duration-700 cursor-default">界</span>
            <span className="text-biblio-green/40">.</span>
          </h1>

          <div className="max-w-2xl mx-auto border-l-2 md:border-l-0 md:border-t-2 border-biblio-green/30 pl-6 md:pl-0 md:pt-6 py-2 mb-12 fade-in flex flex-col md:flex-row gap-6 text-left md:text-center" style={{ animationDelay: '0.2s' }}>
            <p className="text-lg font-sans leading-relaxed flex-1 opacity-80">
              阅读不仅是思想的漫游，更是地理维度的跨越。
              <br className="hidden md:block" />
              将您的书单转化为可视化的环球轨迹。
            </p>
          </div>

          <button 
            onClick={() => setShowWizard(true)}
            className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-biblio-green text-white text-sm font-bold tracking-[0.2em] uppercase overflow-hidden transition-all hover:shadow-xl hover:shadow-biblio-green/20 fade-in"
            style={{ animationDelay: '0.4s' }}
          >
            <span className="relative z-10 flex items-center gap-3">
              开启旅程 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </div>

      </main>
      
      <NetworkBackground />

      {/* Input Wizard Modal */}
      {showWizard && (
        <InputWizard 
          onJourneyReady={onJourneyStart} 
          onCancel={() => setShowWizard(false)} 
        />
      )}

    </div>
  );
};

export default LandingPage;