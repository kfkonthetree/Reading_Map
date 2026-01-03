import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import MainApp from './components/MainApp';
import { ScreenState, JourneyData } from './types';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>(ScreenState.LANDING);
  const [journeyData, setJourneyData] = useState<JourneyData | null>(null);

  const handleJourneyStart = (data: JourneyData) => {
    setJourneyData(data);
    setCurrentScreen(ScreenState.APP);
  };

  return (
    <div className="w-full min-h-screen">
      {currentScreen === ScreenState.LANDING ? (
        <LandingPage onJourneyStart={handleJourneyStart} />
      ) : (
        journeyData && (
          <MainApp 
            onBack={() => setCurrentScreen(ScreenState.LANDING)} 
            journeyData={journeyData}
          />
        )
      )}
    </div>
  );
};

export default App;