import React, { useState } from 'react';
import { Sparkles, ArrowRight, Loader2, BookText, Image as ImageIcon, FileSpreadsheet } from 'lucide-react';
import { generateReadingJourney } from '../services/geminiService';
import { JourneyData } from '../types';

interface InputWizardProps {
  onJourneyReady: (data: JourneyData) => void;
  onCancel: () => void;
}

const InputWizard: React.FC<InputWizardProps> = ({ onJourneyReady, onCancel }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'file'>('text');

  const handleSubmit = async () => {
    if (!input.trim()) return;
    
    setIsLoading(true);
    try {
      const data = await generateReadingJourney(input);
      // Sort by date before passing
      data.books.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      onJourneyReady(data);
    } catch (e) {
      console.error(e);
      alert("生成失败，请重试");
      setIsLoading(false);
    }
  };

  const placeholderText = `例如：
《长安的荔枝》 2024.01.15
《老人与海》 2024-02
村上春树 1Q84 2024.3.20`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-biblio-green/20 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl shadow-2xl rounded-sm overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="bg-biblio-green p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-serif font-bold tracking-wide">开启阅读旅程</h2>
            <p className="text-biblio-accent text-sm mt-1 opacity-80">告诉 AI 你读了什么，为你绘制精神地图</p>
          </div>
          <Sparkles className="text-biblio-accent animate-pulse" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button 
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTab === 'text' ? 'text-biblio-green border-b-2 border-biblio-green bg-gray-50' : 'text-gray-400 hover:text-biblio-green/60'}`}
          >
            <BookText size={16} /> 文字输入
          </button>
          <button 
            disabled
            className="flex-1 py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 text-gray-300 cursor-not-allowed"
          >
            <ImageIcon size={16} /> 图片识别 (Coming Soon)
          </button>
           <button 
            disabled
            className="flex-1 py-4 text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 text-gray-300 cursor-not-allowed"
          >
            <FileSpreadsheet size={16} /> 表格导入 (Coming Soon)
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-biblio-green">
              <Loader2 size={48} className="animate-spin mb-4" />
              <p className="font-serif text-lg animate-pulse">正在编织您的世界地图...</p>
              <p className="text-xs text-gray-400 mt-2">寻找书籍的精神坐标 / 计算经纬度 / 生成寄语</p>
            </div>
          ) : (
            <>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholderText}
                className="w-full h-48 p-4 border border-gray-200 rounded-sm focus:border-biblio-green focus:ring-1 focus:ring-biblio-green outline-none resize-none font-mono text-sm leading-relaxed text-gray-700 bg-gray-50"
              />
              
              <div className="flex justify-end items-center gap-4 mt-6">
                <button 
                  onClick={onCancel}
                  className="px-6 py-2 text-sm text-gray-500 hover:text-gray-800 font-bold tracking-wide"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className="flex items-center gap-2 px-8 py-3 bg-biblio-green text-white font-bold tracking-widest uppercase hover:bg-biblio-green/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  生成地图 <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InputWizard;