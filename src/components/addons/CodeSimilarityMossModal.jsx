import React, { useState, useEffect } from 'react';
import { ShieldAlert, FileCode, AlertTriangle, CheckCircle2, Eye, X, RefreshCw } from 'lucide-react';
import { extendedFeaturesService } from '../../services/extendedFeatures.js';
import { sound } from '../../utils/sound.js';

export default function CodeSimilarityMossModal({ triggerToast }) {
  const [mossData, setMossData] = useState(() => extendedFeaturesService.getCodeMossData());
  const [selectedPair, setSelectedPair] = useState(mossData.pairs?.[0] || null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let mounted = true;
    extendedFeaturesService.fetchCodeMossData().then(res => {
      if (mounted && res?.data) {
        setMossData(res.data);
        setSelectedPair(prev => res.data.pairs?.find(p => p.pairId === prev?.pairId) || res.data.pairs?.[0] || null);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleRunScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    try {
      const res = await extendedFeaturesService.scanCodeMoss();
      if (res?.data) {
        setMossData(res.data);
        setSelectedPair(prev => res.data.pairs?.find(p => p.pairId === prev?.pairId) || res.data.pairs?.[0] || null);
      }
      sound.warning();
      triggerToast?.(res?.message || `🔍 Đã quét AST ${res?.data?.totalScanned || 88} bài nộp Lab: Phát hiện ${res?.data?.flaggedCount ?? 2} cặp mã nguồn có độ tương đồng cấu trúc > 80%!`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div id="modal-moss-diff" className="mt-0 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-rose-500/30 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30">
            Công cụ Kiểm tra Tương đồng Mã nguồn (AST)
          </span>
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-1">
            Quét Trùng lặp Cấu trúc Code & Phát hiện Sao chép Bài nộp
          </h3>
          <p className="text-xs text-slate-500">
            Tự động chuẩn hóa tên biến và hàm để phát hiện các bài nộp giữ nguyên cấu trúc vòng lặp hoặc con trỏ. • Lần quét gần nhất: <b className="text-slate-700 dark:text-slate-300">{mossData.lastScanAt}</b> ({mossData.totalScanned} bài nộp)
          </p>
        </div>

        <button
          id="btn-run-moss-scan"
          type="button"
          disabled={isScanning}
          onClick={handleRunScan}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer shrink-0 shadow-md"
        >
          <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Đang phân tích cấu trúc...' : `Quét lại Toàn bộ ${mossData.totalScanned || 88} Bài nộp`}</span>
        </button>
      </div>

      {/* Empty State or Suspicious Pairs Selector */}
      {(!mossData.pairs || mossData.pairs.length === 0) ? (
        <div id="empty-moss-pairs" className="p-6 sm:p-8 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
            Hiện chưa có dữ liệu bài nộp hoặc cặp mã nguồn trùng lặp
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Khi sinh viên lớp CNTT K26 nộp bài Lab và hệ thống thực hiện quét AST, các cặp bài nộp có độ tương đồng cao sẽ hiển thị tại đây.
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {mossData.pairs.map(p => (
          <div
            key={p.pairId}
            onClick={() => setSelectedPair(p)}
            className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
              selectedPair?.pairId === p.pairId
                ? 'bg-rose-500/10 border-rose-500 shadow-sm'
                : 'bg-slate-50 dark:bg-[#090e1a] border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                {p.studentA.name} ({p.studentA.code}) ↔ {p.studentB.name} ({p.studentB.code})
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-black">
                Trùng {p.similarityPercent}%
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5">{p.structuralNote}</p>
          </div>
        ))}
      </div>
      )}

      {/* Side-by-Side Code Comparison */}
      {selectedPair && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2 border border-rose-500/40">
            <div className="flex items-center justify-between text-rose-300 font-sans font-bold text-xs pb-2 border-b border-slate-800">
              <span>📄 Bài nộp 1: {selectedPair.studentA.name} ({selectedPair.studentA.code})</span>
              <span>{selectedPair.matchedTokens} cụm cú pháp trùng khớp</span>
            </div>
            <pre className="overflow-x-auto text-[11px] leading-relaxed text-emerald-300">{selectedPair.codeA}</pre>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2 border border-rose-500/40">
            <div className="flex items-center justify-between text-amber-300 font-sans font-bold text-xs pb-2 border-b border-slate-800">
              <span>📄 Bài nộp 2: {selectedPair.studentB.name} ({selectedPair.studentB.code})</span>
              <span>Đã đổi tên biến nhưng trùng 100% nhánh lệnh</span>
            </div>
            <pre className="overflow-x-auto text-[11px] leading-relaxed text-amber-200">{selectedPair.codeB}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
