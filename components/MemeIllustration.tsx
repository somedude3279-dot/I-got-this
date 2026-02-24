
import React from 'react';

const MemeIllustration: React.FC = () => {
  return (
    <div className="flex flex-col items-center gap-4 mb-6">
      <div className="relative bg-white p-4 rounded-3xl border-4 border-[#e5e5e5] shadow-lg max-w-sm">
        <div className="flex gap-2 mb-2">
          <div className="w-32 h-20 bg-[#f7f7f7] rounded-lg border-2 border-dashed border-[#ccc] flex items-center justify-center text-[10px] text-[#aaa]">IMAGE A</div>
          <div className="w-32 h-20 bg-[#f7f7f7] rounded-lg border-2 border-dashed border-[#ccc] flex items-center justify-center text-[10px] text-[#aaa]">IMAGE B</div>
        </div>
        <div className="bg-[#1cb0f6] rounded-xl p-2 text-white font-bold text-center text-sm">
          "They're the same picture."
        </div>
        {/* Generic Assistant mascot */}
        <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-[#1cb0f6] rounded-full border-4 border-white shadow-md flex items-center justify-center overflow-hidden">
           <i className="fas fa-robot text-white"></i>
        </div>
      </div>
    </div>
  );
};

export default MemeIllustration;
