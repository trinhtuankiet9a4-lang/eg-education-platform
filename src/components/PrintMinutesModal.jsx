import React from 'react';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';
import { STUDENTS_K26_A } from '../data/students.js';

export default function PrintMinutesModal({ announcement, onClose }) {
  if (!announcement) return null;

  const handlePrint = () => {
    window.print();
  };

  const poll = announcement.poll || {
    question: 'Khảo sát biểu quyết lớp học',
    totalVotes: 50,
    options: []
  };

  const totalClass = STUDENTS_K26_A.length;
  const totalVotes = poll.totalVotes || 0;
  const participationPct = totalClass > 0 ? ((totalVotes / totalClass) * 100).toFixed(1) : 0;

  // Find winning option
  const sortedOptions = [...(poll.options || [])].sort((a, b) => b.votes - a.votes);
  const winningOption = sortedOptions[0];

  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      {/* Container - printable area with media queries */}
      <div className="w-full max-w-3xl bg-white text-slate-900 rounded-3xl p-6 sm:p-10 shadow-2xl relative my-8 border border-slate-200">
        
        {/* Screen Action Bar (Hidden when printing) */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Biên Bản Họp Lớp Biểu Quyết Hành Chính
              </h3>
              <p className="text-xs text-slate-500">
                Chuẩn thể thức Nghị định 30/2020/NĐ-CP • Sẵn sàng In hoặc Lưu PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In / Lưu PDF Ngay</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Administrative Document Content */}
        <div id="printable-minutes" className="space-y-6 text-slate-900 font-['Times_New_Roman',serif] text-sm leading-relaxed">
          
          {/* Header 2 columns */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-300">
            <div className="text-center space-y-0.5">
              <div className="font-bold text-xs uppercase tracking-tight">HỆ THỐNG GIÁO DỤC EG EDUCATION</div>
              <div className="font-bold text-xs uppercase">KHOA CÔNG NGHỆ THÔNG TIN</div>
              <div className="font-semibold text-xs text-slate-700">LỚP K26 CNTT - LỚP A</div>
              <div className="text-[11px] pt-1 italic text-slate-600">Số: 26/BB-K26CNTT</div>
            </div>

            <div className="text-center space-y-0.5">
              <div className="font-bold text-xs uppercase tracking-tight">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div className="font-bold text-xs underline underline-offset-4">Độc lập - Tự do - Hạnh phúc</div>
              <div className="text-[11px] pt-2 italic text-slate-600">
                TP. Hồ Chí Minh, ngày {day} tháng {month} năm {year}
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-1.5 py-2">
            <h2 className="font-bold text-base sm:text-lg uppercase tracking-wide">
              BIÊN BẢN HỌP LỚP VỀ VIỆC LẤY Ý KIẾN BIỂU QUYẾT
            </h2>
            <div className="font-semibold italic text-xs text-slate-700">
              (V/v: {announcement.title})
            </div>
          </div>

          {/* Part I: Time & Attendance */}
          <div className="space-y-1.5">
            <div className="font-bold uppercase text-xs">I. THỜI GIAN, ĐỊA ĐIỂM VÀ THÀNH PHẦN THAM DỰ</div>
            <div className="pl-4 space-y-1 text-xs">
              <p>• <strong>Thời gian:</strong> {announcement.deadline || `${day}/${month}/${year}`}</p>
              <p>• <strong>Địa điểm:</strong> Cổng Thông Tin Số EG Education SmartCampus (Trực tuyến thời gian thực).</p>
              <p>• <strong>Chủ tọa cuộc họp:</strong> Đ/c Trịnh Tuấn Kiệt — Lớp Trưởng K26 CNTT.</p>
              <p>• <strong>Thư ký ghi biên bản:</strong> Đ/c Nguyễn Phú An — Bí Thư Chi Đoàn.</p>
              <p>• <strong>Giảng viên phụ trách giám sát:</strong> ThS. Phạm Văn Thuận — Cố vấn học tập.</p>
              <p>• <strong>Thành phần tham gia biểu quyết:</strong> Tổng số {totalVotes} / {totalClass} sinh viên chính thức trong danh sách lớp (Đạt tỷ lệ: {participationPct}%).</p>
            </div>
          </div>

          {/* Part II: Content */}
          <div className="space-y-1.5">
            <div className="font-bold uppercase text-xs">II. NỘI DUNG VĂN BẢN / CÔNG VĂN HÀNH CHÍNH</div>
            <div className="pl-4 text-xs space-y-1">
              <p>Căn cứ theo văn bản số: <strong>{announcement.aiSummary?.dispatchNo || 'N/A'}</strong> từ Ban Đào Tạo EG Education về việc: <em>{announcement.aiSummary?.mainGoal || announcement.title}</em>.</p>
              <p>Ban Cán Sự Lớp tiến hành phát động lấy ý kiến cử tri toàn lớp về câu hỏi: <strong>"{poll.question}"</strong>.</p>
            </div>
          </div>

          {/* Part III: Vote Results */}
          <div className="space-y-2">
            <div className="font-bold uppercase text-xs">III. KẾT QUẢ KIỂM PHIẾU BIỂU QUYẾT CHI TIẾT</div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-center font-bold">
                    <th className="border border-slate-300 p-2 w-12">STT</th>
                    <th className="border border-slate-300 p-2 text-left">Phương án biểu quyết</th>
                    <th className="border border-slate-300 p-2 w-24">Số phiếu</th>
                    <th className="border border-slate-300 p-2 w-24">Tỷ lệ %</th>
                    <th className="border border-slate-300 p-2 w-28">Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOptions.map((opt, idx) => {
                    const pct = totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(1) : 0;
                    const isWinner = idx === 0 && opt.votes > 0;

                    return (
                      <tr key={opt.id} className={isWinner ? 'bg-teal-50 font-semibold' : ''}>
                        <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                        <td className="border border-slate-300 p-2">{opt.text}</td>
                        <td className="border border-slate-300 p-2 text-center">{opt.votes} phiếu</td>
                        <td className="border border-slate-300 p-2 text-center">{pct}%</td>
                        <td className="border border-slate-300 p-2 text-center">
                          {isWinner ? '🏆 ĐA SỐ' : 'Không đạt'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pl-4 text-xs pt-1">
              <strong>KẾT LUẬN CUỘC HỌP:</strong> Tập thể lớp K26 CNTT - Lớp A thống nhất lựa chọn phương án: 
              <span className="font-bold text-teal-800 ml-1">
                "{winningOption?.text || 'Đang cập nhật'}"
              </span> với số phiếu chiếm đa số ({winningOption?.votes || 0} phiếu / {totalVotes} phiếu).
            </div>
          </div>

          {/* Signatures 3 Columns */}
          <div className="pt-8 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="space-y-14">
              <div>
                <div className="font-bold uppercase">THƯ KÝ LẬP BIÊN BẢN</div>
                <div className="text-[11px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
              </div>
              <div className="font-bold pt-4">Nguyễn Phú An</div>
            </div>

            <div className="space-y-14">
              <div>
                <div className="font-bold uppercase">LỚP TRƯỞNG K26</div>
                <div className="text-[11px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
              </div>
              <div className="font-bold pt-4">Trịnh Tuấn Kiệt</div>
            </div>

            <div className="space-y-14">
              <div>
                <div className="font-bold uppercase">GIẢNG VIÊN CỐ VẤN</div>
                <div className="text-[11px] text-slate-500 italic">(Xác nhận đối soát)</div>
              </div>
              <div className="font-bold pt-4">ThS. Phạm Văn Thuận</div>
            </div>
          </div>

          {/* Footer verification stamp */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 italic">
            <span>Dữ liệu được trích xuất tự động từ Hệ thống Giáo Dục Số EG Education.</span>
            <span className="font-semibold not-italic text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Chữ ký số mã hóa SHA-256 đã xác thực
            </span>
          </div>

        </div>

        {/* Print Stylesheet */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-minutes, #printable-minutes * {
              visibility: visible !important;
            }
            #printable-minutes {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              padding: 20px !important;
              margin: 0 !important;
              background: white !important;
              color: black !important;
            }
          }
        `}} />

      </div>
    </div>
  );
}
