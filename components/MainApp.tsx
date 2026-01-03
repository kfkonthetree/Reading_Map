import React, { useState } from 'react';
import ReadingMap from './ReadingMap';
import SummaryPostcard from './SummaryPostcard';
import { JourneyData } from '../types';

interface MainAppProps {
  onBack: () => void;
  journeyData: JourneyData;
}

const MainApp: React.FC<MainAppProps> = ({ onBack, journeyData }) => {
  const [showPostcard, setShowPostcard] = useState(false);

  return (
    <>
      <ReadingMap 
        onBack={onBack} 
        journeyData={journeyData}
        onShowSummary={() => setShowPostcard(true)}
      />
      {showPostcard && (
        <SummaryPostcard 
          data={journeyData} 
          onClose={() => setShowPostcard(false)} 
        />
      )}
    </>
  );
};

export default MainApp;