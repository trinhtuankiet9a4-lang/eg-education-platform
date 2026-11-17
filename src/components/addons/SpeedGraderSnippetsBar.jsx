import React from 'react';
import { Zap } from 'lucide-react';
import PeerReviewCalibrationAddon from './PeerReviewCalibrationAddon';

const QUICK_SNIPPETS = [
  { label: '🏆 Thuật toán tối ưu O(log N)', score: '10', text: 'Cài đặt chuẩn thuật toán, độ phức tạp O(log N) tối ưu, xử lý tốt các trường hợp biên.' },
  { label: '⚠️ Thiếu kiểm tra con trỏ NULL', score: '8.0', text: 'Logic chính đúng nhưng thiếu kiểm tra con trỏ nullptr ở hàm xóa nút lá, dễ gây lỗi bộ nhớ.' },
  { label: '🐢 Độ phức tạp chưa tối ưu O(N²)', score: '7.0', text: 'Kết quả đầu ra đúng nhưng dùng 2 vòng lặp lồng nhau O(N²), cần cải tiến bằng Min-Heap hoặc Hash.' },
  { label: '🧹 Cần tách hàm & thêm Comment', score: '8.5', text: 'Thuật toán chạy tốt, tuy nhiên viết dồn vào hàm main(), cần tách module và bổ sung chú thích.' }
];

export function SpeedGraderSnippetsBar({ onApplySnippet }) {
  return (
    <div id="bar-speedgrader-snippets" className="mt-0 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/25 space-y-2">
      <div className="flex items-center justify-between text-[11px] font-extrabold text-purple-800 dark:text-purple-300">
        <span className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" />
          <span>Mẫu nhận xét & điểm nhanh — Chọn 1 chạm để điền:</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_SNIPPETS.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onApplySnippet(s.score, s.text)}
            className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#090e1a] hover:bg-purple-600 hover:text-white border border-purple-500/30 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
          >
            {s.label} ({s.score}đ)
          </button>
        ))}
      </div>
    </div>
  );
}

export { PeerReviewCalibrationAddon };
export default SpeedGraderSnippetsBar;
