import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  UploadCloud,
  GitBranch,
  CheckCircle2,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  BookOpen,
  BookMarked,
  Download,
  Eye,
  EyeOff,
  FolderOpen,
  Calendar,
  UserCheck,
  PlusCircle
} from 'lucide-react';
import { api } from '../../services/api.js';
import { extendedFeaturesService } from '../../services/extendedFeatures.js';
import { sound } from '../../utils/sound.js';
import { exportBloomLessonToPptx } from '../../utils/pptxExport.js';

const BRANCH_COLORS = ['#8b5cf6', '#0ea5e9', '#a855f7', '#f59e0b'];
const RECAP_STORAGE_KEY = 'eg_course_recap_archive_v1';

export const RECAP_SUBJECTS = [
  'Kỹ thuật lập trình (KC213013)',
  'Lập trình Python',
  'Cấu trúc dữ liệu & Giải thuật',
  'Cơ sở dữ liệu & SQL',
  'Tiếng Anh 1'
];

const DEFAULT_MINDMAP = {
  id: 'MM-IT204-01',
  classId: 'K26 CNTT - Lớp A',
  subject: 'Cấu trúc dữ liệu & Giải thuật',
  title: 'Chương 5: Bảng Băm (Hash Table) & Quy Hoạch Động',
  sourceFileName: 'Slide_Chuong5_HashTable_DP.pdf',
  uploadedAt: '17/11/2026',
  publishedToClass: true,
  createdBy: 'ThS. Phạm Văn Thuận',
  aiEngine: 'EG Education Curriculum Engine',
  keyTakeaways: [
    'Bảng băm (Hash Table) ánh xạ khóa sang chỉ mục mảng qua hàm băm h(k), đạt độ phức tạp tra cứu trung bình O(1).',
    'Hai chiến lược xử lý đụng độ (Collision Resolution): Chaining (Danh sách liên kết tại mỗi bucket) và Open Addressing (Linear/Quadratic Probing, Double Hashing).',
    'Quy hoạch động (Dynamic Programming) giải quyết bài toán có cấu trúc con tối ưu (Optimal Substructure) và bài toán con gối nhau (Overlapping Subproblems).',
    'Phân biệt 2 hướng cài đặt DP: Top-Down (Đệ quy + Memoization) và Bottom-Up (Lập bảng tuần tự khử đệ quy).'
  ],
  infographicCards: [
    { metric: 'O(1)', label: 'Tra cứu / Chèn trung bình trên Hash Table (α < 0.75)', badge: 'Tốc độ tối đa' },
    { metric: 'α = N / M', label: 'Hệ số tải (Load Factor) quyết định ngưỡng Rehash ×2', badge: 'Kiểm soát đụng độ' },
    { metric: 'O(N·W)', label: 'DP Bài toán Cái Túi (0/1 Knapsack) Bottom-Up', badge: 'Khử chồng lấn' },
    { metric: '2 Chiến Lược', label: 'Separate Chaining & Open Addressing giảm đụng độ', badge: 'Bền vững' }
  ],
  mindmapTree: {
    root: 'Chương 5: Bảng Băm (Hash Table) & Quy Hoạch Động',
    branches: [
      {
        id: 'b1',
        title: '1. Hàm Băm & Tách Bucket',
        color: 'emerald',
        formula: 'h(k) = (a·k + b) mod M | α = N / M',
        items: [
          'Hàm băm chia dư & nhân (Division / Multiplication)',
          'Phân bố đều khóa, giảm gom cụm (Clustering)',
          'Rehashing tự động khi Load Factor α > 0.75',
          'Ứng dụng: Dictionary, Cache Redis, Index CSDL'
        ]
      },
      {
        id: 'b2',
        title: '2. Xử Lý Đụng Độ (Collision)',
        color: 'sky',
        formula: 'Chaining vs Linear Probing: (h(k)+i) mod M',
        items: [
          'Separate Chaining: Linked List / AVL tại mỗi ô',
          'Linear Probing: Thăm dò tuyến tính đơn giản',
          'Quadratic Probing & Double Hashing tránh Primary Clustering',
          'Độ phức tạp tồi nhất O(N) khi mọi khóa đụng độ'
        ]
      },
      {
        id: 'b3',
        title: '3. Nguyên Lý Quy Hoạch Động',
        color: 'purple',
        formula: 'dp[state] = opt(dp[prev_states]) + cost',
        items: [
          'Xác định Trạng thái (State) & Bài toán cơ sở (Base case)',
          'Thiết lập Công thức truy hồi (Transition Equation)',
          'Top-Down (Memoization) trực quan dễ viết',
          'Bottom-Up (Tabulation) tối ưu bộ nhớ O(W)'
        ]
      },
      {
        id: 'b4',
        title: '4. Bài Toán DP Kinh Điển',
        color: 'amber',
        formula: 'LCS / LIS / Knapsack / Floyd-Warshall',
        items: [
          'Dãy con tăng dài nhất (LIS) O(N log N)',
          'Xâu con chung dài nhất (LCS) bảng M×N',
          '0/1 Knapsack tối ưu giá trị trong giới hạn tải',
          'Kết hợp DP + Bitmask cho tập hợp nhỏ N ≤ 20'
        ]
      }
    ]
  }
};

const CURATED_COURSE_RECAPS = [
  {
    id: 'RECAP-PY-01',
    subject: 'Lập trình Python',
    lessonLabel: 'Buổi 1 • Tuần 16/11',
    lectureDate: '17/11/2026 (Tiết 7-10)',
    lecturer: 'GV. Từ Ngọc Thảo',
    title: 'Bài 1: Cú pháp Python căn bản, Cấu trúc rẽ nhánh & Vòng lặp',
    sourceFileName: 'BaiGiang_Python_Buoi1_CuPhap_VongLap.pptx',
    fileSize: '2.4 MB • 28 Slide',
    keyTakeaways: [
      'Python dùng thụt lề (indentation 4 khoảng trắng) để phân tách khối lệnh thay cho dấu ngoặc nhọn {}.',
      'Kiểu dữ liệu động (Dynamic Typing): int, float, str, bool, None; chuyển đổi kiểu rõ ràng bằng int(), float(), str().',
      'Câu lệnh điều kiện if / elif / else kết hợp toán tử logic and, or, not và biểu thức điều kiện 1 dòng.',
      'Hai vòng lặp cốt lõi: for x in range(start, stop, step) duyệt hữu hạn và while điều khiển theo điều kiện; break / continue kiểm soát luồng.'
    ],
    infographicCards: [
      { metric: '4 Spaces', label: 'Quy chuẩn thụt lề khối lệnh PEP 8 bắt buộc trong Python', badge: 'Cú pháp chuẩn' },
      { metric: 'for / while', label: 'Hai cấu trúc lặp cốt lõi kèm range(), enumerate(), zip()', badge: 'Điều khiển luồng' },
      { metric: '28 Slides', label: 'Slide bài giảng gốc kèm ví dụ minh họa chạy trực tiếp', badge: 'Tài liệu đính kèm' },
      { metric: '4 Trọng tâm', label: 'Điểm cốt lõi cần nắm trước buổi thực hành Python kế tiếp', badge: 'Ôn tập bài cũ' }
    ],
    lessonSlides: [
      'Slide 1 [Phần 1 - Khởi động]: Giới thiệu ngôn ngữ Python & Cài đặt môi trường – Thông dịch viên Python 3, VS Code và cách chạy script đầu tiên.',
      'Slide 2 [Phần 1 - Biến & Kiểu dữ liệu]: Dynamic Typing trong Python – Khai báo biến không cần chỉ định kiểu trước; kiểm tra kiểu bằng type().',
      'Slide 3 [Phần 2 - Nhập xuất & Ép kiểu]: input() và print() f-string – Mọi giá trị đọc từ input() là str; cần ép kiểu int() hoặc float() trước khi tính toán.',
      'Slide 4 [Phần 2 - Cấu trúc rẽ nhánh]: if, elif, else và thụt lề – Toán tử so sánh ==, !=, <, >, in và kết hợp điều kiện and / or / not.',
      'Slide 5 [Phần 2 - Vòng lặp for]: Hàm range(start, stop, step) – Duyệt chuỗi, dãy số; sử dụng enumerate() khi cần cả chỉ số và giá trị.',
      'Slide 6 [Phần 3 - Vòng lặp while & Tối ưu]: break, continue và bẫy lặp vô hạn – Kiểm soát điều kiện dừng trong bài toán nhập liệu & tính tổng chuỗi.'
    ],
    mindmapTree: {
      root: 'Lập trình Python • Bài 1: Cú pháp & Vòng lặp',
      branches: [
        {
          id: 'b1',
          title: '1. Biến & Kiểu dữ liệu',
          color: 'emerald',
          formula: 'int / float / str / bool • type(x)',
          items: [
            'Gán biến trực tiếp không cần từ khóa var/int',
            'Ép kiểu an toàn int(), float(), str(), bool()',
            'Chuỗi f-string: f"Xin chào {ten}" định dạng nhanh',
            'Quy tắc đặt tên snake_case theo chuẩn PEP 8'
          ]
        },
        {
          id: 'b2',
          title: '2. Câu lệnh Rẽ nhánh',
          color: 'sky',
          formula: 'if cond1: ... elif cond2: ... else: ...',
          items: [
            'Thụt lề đúng 4 khoảng trắng cho mỗi khối lệnh',
            'Toán tử logic: and, or, not dễ đọc như tiếng Anh',
            'Toán tử thành viên: in / not in trên chuỗi & list',
            'Biểu thức 3 ngôi: val = A if cond else B'
          ]
        },
        {
          id: 'b3',
          title: '3. Vòng lặp For & Range',
          color: 'purple',
          formula: 'for i in range(0, n, 1):',
          items: [
            'range(n) sinh từ 0 đến n-1 (không gồm n)',
            'range(start, stop, step) hỗ trợ bước nhảy âm',
            'Duyệt trực tiếp từng ký tự trong chuỗi ký tự',
            'enumerate(seq) lấy đồng thời (index, item)'
          ]
        },
        {
          id: 'b4',
          title: '4. Vòng lặp While & Bài tập',
          color: 'amber',
          formula: 'while condition: ... break / continue',
          items: [
            'Dùng when chưa biết trước số lần lặp cố định',
            'break thoát vòng lặp tức thì; continue qua vòng mới',
            'Luôn cập nhật biến điều kiện tránh lặp vô tận',
            'Bài tập mẫu: Kiểm tra số nguyên tố & Fibonacci'
          ]
        }
      ]
    }
  },
  {
    id: 'RECAP-DSA-01',
    subject: 'Cấu trúc dữ liệu & Giải thuật',
    lessonLabel: 'Chương 4 • Bài cũ',
    lectureDate: 'Buổi tuần trước',
    lecturer: 'ThS. Phạm Văn Thuận',
    title: 'Chương 4: Đồ thị có trọng số & Đường đi ngắn nhất (Dijkstra / Floyd-Warshall)',
    sourceFileName: 'Slide_Chuong4_DoThi_Dijkstra_Floyd_IT204.pptx',
    fileSize: '3.4 MB • 42 Slide',
    keyTakeaways: [
      'Biểu diễn đồ thị bằng Danh sách kề (Adjacency List) tiết kiệm bộ nhớ O(V + E) cho đồ thị thưa, vượt trội Ma trận kề O(V²).',
      'Thuật toán Dijkstra giải bài toán Single-Source Shortest Path khi mọi trọng số cạnh không âm (w ≥ 0), đạt O((V + E) log V) với Min-Heap.',
      'Phép thư giãn cạnh (Edge Relaxation): nếu dist[u] + w(u, v) < dist[v] thì cập nhật dist[v] và đẩy đỉnh v vào hàng đợi ưu tiên.',
      'Floyd-Warshall dùng Quy hoạch động tìm đường đi ngắn nhất giữa mọi cặp đỉnh với chi phí O(V³), xử lý được cạnh âm nếu không có chu trình âm.'
    ],
    infographicCards: [
      { metric: 'O((V+E) log V)', label: 'Độ phức tạp Dijkstra kết hợp Min-Heap tối ưu', badge: 'Đơn nguồn (w ≥ 0)' },
      { metric: 'O(V³)', label: 'Floyd-Warshall 3 vòng lặp tính mọi cặp đỉnh', badge: 'Mọi cặp đỉnh' },
      { metric: '42 Slides', label: 'Slide minh họa từng bước giảm nhẹ cạnh & vết đường đi', badge: 'File bài giảng' },
      { metric: 'Min-Heap', label: 'Cấu trúc trích xuất đỉnh khoảng cách nhỏ nhất tức thì', badge: 'Cấu trúc cốt lõi' }
    ],
    lessonSlides: [
      'Slide 1 [Phần 1 - Mô hình hóa]: Đồ thị có hướng & vô hướng có trọng số – Danh sách kề vs Ma trận kề trong bài toán thực tế.',
      'Slide 2 [Phần 1 - Phép Relaxation]: Bất đẳng thức tam giác đường đi – Cơ sở toán học cho cập nhật nhãn khoảng cách tối ưu.',
      'Slide 3 [Phần 2 - Dijkstra Greedy]: Thuật toán tham lam chọn đỉnh gần nhất – Chứng minh tính đúng đắn khi mọi cạnh có trọng số ≥ 0.',
      'Slide 4 [Phần 2 - Hàng đợi ưu tiên]: Cài đặt Priority Queue (Min-Heap) – Lưu cặp (dist, vertex) và bỏ qua trạng thái cũ lạc hậu.',
      'Slide 5 [Phần 3 - Floyd-Warshall DP]: Đỉnh trung gian k ∈ {1..V} – Công thức d[i][j] = min(d[i][j], d[i][k] + d[k][j]).',
      'Slide 6 [Phần 3 - Tổng kết & Đối sánh]: Khi nào chọn Dijkstra vs Bellman-Ford vs Floyd-Warshall dựa theo V, E và dấu trọng số.'
    ],
    mindmapTree: {
      root: 'Chương 4: Đồ thị & Đường đi ngắn nhất',
      branches: [
        {
          id: 'b1',
          title: '1. Biểu diễn Đồ thị',
          color: 'emerald',
          formula: 'Adj List: O(V + E) | Matrix: O(V²)',
          items: [
            'Ma trận kề kiểm tra cạnh (u, v) trong O(1)',
            'Danh sách kề tối ưu cho đồ thị thưa E << V²',
            'Danh sách cạnh dùng cho Kruskal & Bellman-Ford',
            'Đánh số đỉnh chuẩn hóa & mảng truy vết parent[]'
          ]
        },
        {
          id: 'b2',
          title: '2. Thuật toán Dijkstra',
          color: 'sky',
          formula: 'if dist[u] + w < dist[v] => update',
          items: [
            'Khởi tạo dist[src] = 0, các đỉnh khác = +∞',
            'Min-Heap trích đỉnh u có dist[u] nhỏ nhất',
            'Yêu cầu bắt buộc: mọi trọng số cạnh w(u, v) ≥ 0',
            'Thời gian O((V + E) log V) với Priority Queue'
          ]
        },
        {
          id: 'b3',
          title: '3. Floyd-Warshall (DP)',
          color: 'purple',
          formula: 'd[i][j] = min(d[i][j], d[i][k] + d[k][j])',
          items: [
            'Vòng lặp ngoài cùng bắt buộc là đỉnh trung gian k',
            'Tính khoảng cách ngắn nhất mọi cặp (i, j) cùng lúc',
            'Phát hiện chu trình âm khi d[i][i] < 0',
            'Phù hợp cho đồ thị nhỏ V ≤ 400 đỉnh'
          ]
        },
        {
          id: 'b4',
          title: '4. Lựa chọn & Ứng dụng',
          color: 'amber',
          formula: 'Dijkstra vs Bellman-Ford vs Floyd',
          items: [
            'Bản đồ GPS & Định tuyến gói tin OSPF/RIP',
            'Dijkstra đơn nguồn dương; Bellman-Ford có cạnh âm',
            'Truy vết ngược mảng prev[] in lộ trình chi tiết',
            'Cảnh giác lỗi tràn số int khi cộng +∞ với trọng số'
          ]
        }
      ]
    }
  },
  {
    id: 'RECAP-KC213013-01',
    subject: 'Kỹ thuật lập trình (KC213013)',
    lessonLabel: 'Tổng kết HK1 • Bài cũ',
    lectureDate: 'Học kỳ 1 (Đã hoàn tất)',
    lecturer: 'ThS. Phạm Văn Thuận',
    title: 'Ôn tập Trọng tâm: Con trỏ, Cấp phát động & Hàm đệ quy C/C++',
    sourceFileName: 'OnTap_KC213013_ConTro_CapPhatDong.pdf',
    fileSize: '1.8 MB • 36 Slide',
    keyTakeaways: [
      'Con trỏ lưu giữ địa chỉ ô nhớ (&lấy địa chỉ, *giải tham chiếu giá trị tại địa chỉ đó).',
      'Truyền tham trị (Pass-by-value) chỉ thao tác trên bản sao; dùng Con trỏ hoặc Tham chiếu (&) để thay đổi biến gốc trong hàm.',
      'Cấp phát bộ nhớ động trên Heap bằng new/delete (C++) hoặc malloc/free (C) và luôn đặt con trỏ về nullptr sau giải phóng.',
      'Mọi hàm đệ quy bắt buộc có Điểm dừng (Base Case) rõ ràng và Bước thu nhỏ (Recursive Step) hội tụ về điểm dừng.'
    ],
    infographicCards: [
      { metric: 'Stack vs Heap', label: 'Phân biệt vòng đời biến cục bộ & bộ nhớ cấp phát động', badge: 'Quản lý RAM' },
      { metric: '* & nullptr', label: 'Bộ quy tắc an toàn chống lỗi Dangling & Memory Leak', badge: 'An toàn con trỏ' },
      { metric: '36 Slides', label: 'File tóm tắt môn Kỹ thuật lập trình chuẩn ôn thi KC213013', badge: 'File bài giảng' },
      { metric: 'Base Case', label: 'Điều kiện dừng bắt buộc tránh tràn ngăn xếp Stack Overflow', badge: 'Đệ quy chuẩn' }
    ],
    lessonSlides: [
      'Slide 1 [Phần 1 - Bộ nhớ & Địa chỉ]: Toán tử & và * – Cách biến nằm trên RAM và cách con trỏ trỏ tới địa chỉ biến.',
      'Slide 2 [Phần 1 - Truyền tham số]: Pass-by-Value vs Pass-by-Pointer/Reference – Minh họa hàm hoán vị swap(int &a, int &b).',
      'Slide 3 [Phần 2 - Con trỏ & Mảng]: *(arr + i) tương đương arr[i] – Dịch chuyển con trỏ trên mảng 1 chiều & ma trận động.',
      'Slide 4 [Phần 2 - Cấp phát Heap]: malloc/free và new/delete[] – Phòng tránh rò rỉ bộ nhớ (Memory Leak) và con trỏ treo.',
      'Slide 5 [Phần 3 - Đệ quy]: Cách Call Stack hoạt động – Theo dõi khung ngăn xếp (Stack Frame) cho Giai thừa, Fibonacci, Tháp Hà Nội.'
    ],
    mindmapTree: {
      root: 'KC213013: Con trỏ, Bộ nhớ động & Đệ quy',
      branches: [
        {
          id: 'b1',
          title: '1. Bản chất Con trỏ',
          color: 'emerald',
          formula: 'int *p = &x; *p = 10;',
          items: [
            'Toán tử &x lấy địa chỉ vật lý của biến x',
            'Toán tử *p truy cập/sửa giá trị tại địa chỉ p trỏ tới',
            'Khởi tạo p = nullptr khi chưa gán địa chỉ hợp lệ',
            'Kiểm tra if (p != nullptr) trước khi giải tham chiếu'
          ]
        },
        {
          id: 'b2',
          title: '2. Tham trị vs Tham chiếu',
          color: 'sky',
          formula: 'void swap(int &a, int &b)',
          items: [
            'Tham trị tạo bản sao mới, không ảnh hưởng biến ngoài',
            'Tham chiếu (&) dùng chung ô nhớ với biến gốc',
            'Truyền const T& cho cấu trúc lớn giúp nhanh + an toàn',
            'Mảng truyền vào hàm tự suy biến thành con trỏ đầu mảng'
          ]
        },
        {
          id: 'b3',
          title: '3. Cấp phát Bộ nhớ Động',
          color: 'purple',
          formula: 'int *a = new int[n]; delete[] a;',
          items: [
            'Heap lưu mảng kích thước n xác định tại runtime',
            'Cấp phát bằng new[] phải giải phóng bằng delete[]',
            'Cấp phát bằng malloc() đi kèm calloc/realloc và free()',
            'Giải phóng xong gán a = nullptr tránh Double Free'
          ]
        },
        {
          id: 'b4',
          title: '4. Tư duy Đệ quy & Call Stack',
          color: 'amber',
          formula: 'Base Case + Recursive Call',
          items: [
            'Xác định bài toán cơ sở trả kết quả ngay',
            'Gọi lại chính hàm với kích thước giảm dần',
            'Tránh đệ quy chồng chéo (Fibonacci thô O(2^N))',
            'Hiểu cơ chế Call Stack để phòng Stack Overflow'
          ]
        }
      ]
    }
  },
  {
    id: 'RECAP-SQL-01',
    subject: 'Cơ sở dữ liệu & SQL',
    lessonLabel: 'Chuyên đề 2 • Bài cũ',
    lectureDate: 'Buổi tuần trước',
    lecturer: 'ThS. Phạm Văn Thuận',
    title: 'Thiết kế CSDL quan hệ, Chuẩn hóa 1NF–3NF & Truy vấn JOIN / GROUP BY',
    sourceFileName: 'Slide_CSDL_ChuanHoa_SQL_JOIN.pptx',
    fileSize: '2.1 MB • 30 Slide',
    keyTakeaways: [
      'Khóa chính (PRIMARY KEY) định danh duy nhất mỗi bản ghi; Khóa ngoại (FOREIGN KEY) đảm bảo toàn vẹn tham chiếu giữa các bảng.',
      'Ba dạng chuẩn quan trọng: 1NF (giá trị nguyên tố), 2NF (loại bỏ phụ thuộc bộ phận), 3NF (loại bỏ phụ thuộc bắc cầu).',
      'Phân biệt INNER JOIN (chỉ lấy cặp khớp 2 bảng) với LEFT JOIN (giữ toàn bộ bảng trái dù bên phải NULL).',
      'Thứ tự thực thi SQL: FROM/JOIN -> WHERE (lọc dòng) -> GROUP BY -> HAVING (lọc nhóm) -> SELECT -> ORDER BY -> LIMIT.'
    ],
    infographicCards: [
      { metric: '1NF → 3NF', label: 'Loại bỏ dư thừa dữ liệu & bất thường cập nhật (Anomalies)', badge: 'Chuẩn hóa lược đồ' },
      { metric: 'PK / FK', label: 'Toàn vẹn thực thể & toàn vẹn tham chiếu 1-N / N-N', badge: 'Quan hệ chuẩn' },
      { metric: '30 Slides', label: 'Slide bài giảng SQL kèm sơ đồ ER & truy vấn mẫu SQLite', badge: 'File bài giảng' },
      { metric: 'WHERE vs HAVING', label: 'WHERE lọc trước khi gom nhóm; HAVING lọc trên nhóm tổng hợp', badge: 'Tránh lỗi hay gặp' }
    ],
    lessonSlides: [
      'Slide 1 [Phần 1 - Mô hình ER]: Thực thể, Thuộc tính & Mối quan hệ – Chuyển đổi sơ đồ ER sang các bảng quan hệ.',
      'Slide 2 [Phần 1 - Dạng chuẩn 1NF, 2NF, 3NF]: Phụ thuộc hàm – Tách bảng loại bỏ dư thừa và dị thường chèn/xóa/sửa.',
      'Slide 3 [Phần 2 - Đại số SQL JOIN]: INNER JOIN, LEFT JOIN, RIGHT JOIN – Minh họa bằng sơ đồ Venn và bảng ví dụ Sinh viên - Lớp.',
      'Slide 4 [Phần 2 - Thống kê nhóm]: GROUP BY kết hợp COUNT, SUM, AVG, MAX và điều kiện lọc nhóm HAVING.',
      'Slide 5 [Phần 3 - Tối ưu & Index]: Tạo B-Tree INDEX trên khóa ngoại & cột thường tìm kiếm giúp tăng tốc SELECT.'
    ],
    mindmapTree: {
      root: 'Cơ sở dữ liệu: Chuẩn hóa & Truy vấn SQL',
      branches: [
        {
          id: 'b1',
          title: '1. Mô hình Quan hệ & Khóa',
          color: 'emerald',
          formula: 'PRIMARY KEY & FOREIGN KEY REFERENCES',
          items: [
            'Mỗi bảng đại diện 1 loại thực thể rõ ràng',
            'Khóa chính NOT NULL và duy nhất toàn bảng',
            'Quan hệ nhiều-nhiều tách qua bảng trung gian',
            'Ràng buộc ON DELETE CASCADE / RESTRICT'
          ]
        },
        {
          id: 'b2',
          title: '2. Chuẩn hóa 1NF – 2NF – 3NF',
          color: 'sky',
          formula: 'Atomic (1NF) → Full FD (2NF) → No Transitive (3NF)',
          items: [
            '1NF: Mỗi ô chứa 1 giá trị đơn, không lặp cột',
            '2NF: Thuộc tính không khóa phụ thuộc toàn bộ PK',
            '3NF: Không phụ thuộc bắc cầu A -> B -> C',
            'Giảm trùng lặp và bảo vệ tính nhất quán dữ liệu'
          ]
        },
        {
          id: 'b3',
          title: '3. Phép Kết Bảng (JOIN)',
          color: 'purple',
          formula: 'SELECT ... FROM A INNER/LEFT JOIN B ON A.id = B.a_id',
          items: [
            'INNER JOIN: Chỉ giữ các dòng khớp ở cả A và B',
            'LEFT JOIN: Giữ tất cả dòng bảng trái, thiếu điền NULL',
            'Dùng bí danh (alias) ngắn gọn tránh mơ hồ cột',
            'Cẩn trọng Cartesian Product khi thiếu điều kiện ON'
          ]
        },
        {
          id: 'b4',
          title: '4. Gom Nhóm & Thống Kê',
          color: 'amber',
          formula: 'WHERE → GROUP BY → HAVING → ORDER BY',
          items: [
            'Hàm tổng hợp: COUNT(*), SUM(), AVG(), MIN(), MAX()',
            'Mọi cột không trong hàm tổng hợp phải thuộc GROUP BY',
            'WHERE lọc từng dòng trước khi nhóm; HAVING lọc sau nhóm',
            'Dùng CREATE INDEX tăng tốc WHERE / JOIN lớn'
          ]
        }
      ]
    }
  },
  {
    id: 'RECAP-ENG1-01',
    subject: 'Tiếng Anh 1',
    lessonLabel: 'Tuần 16/11–06/12 • Bài cũ',
    lectureDate: 'Thứ 6 (Tiết 7-10 • P. 9.2.11)',
    lecturer: 'GV. Tôn Nữ Hồng Hà',
    title: 'Unit 1–2 Summary: Present Tenses, Daily Routines & Academic Introduction',
    sourceFileName: 'English1_Unit1_2_Grammar_Vocab_Summary.pdf',
    fileSize: '1.2 MB • 22 Slide',
    keyTakeaways: [
      'Present Simple (S + V/Vs-es) diễn tả thói quen, lịch học cố định, sự thật hiển nhiên kèm trạng từ tần suất (always, usually, often).',
      'Present Continuous (S + am/is/are + V-ing) diễn tả hành động đang xảy ra ngay lúc nói hoặc kế hoạch tương lai gần đã chốt.',
      'Phân biệt Stative Verbs (know, understand, want, belong) không chia thì tiếp diễn trong văn cảnh học thuật.',
      'Cấu trúc giới thiệu bản thân, chuyên ngành CNTT (Information Technology) và giao tiếp cơ bản trên giảng đường.'
    ],
    infographicCards: [
      { metric: 'Simple vs Cont.', label: 'Nắm chắc 2 thì nền tảng chiếm 40% bài kiểm tra Unit 1-2', badge: 'Ngữ pháp trọng tâm' },
      { metric: '35 Words', label: 'Từ vựng chủ đề University Life & IT Classroom', badge: 'Từ vựng cốt lõi' },
      { metric: '22 Slides', label: 'File slide bài giảng tiếng Anh 1 của cô Tôn Nữ Hồng Hà', badge: 'File bài giảng' },
      { metric: 'Speaking Frame', label: 'Khung mẫu câu giới thiệu ngành học & lịch sinh hoạt', badge: 'Thực hành giao tiếp' }
    ],
    lessonSlides: [
      'Slide 1 [Part 1 - Warm-up]: Greetings & Classroom English – Mẫu câu chào hỏi và giới thiệu thông tin cá nhân.',
      'Slide 2 [Part 1 - Present Simple]: Form & Usage – Chia động từ với chủ ngữ số ít he/she/it và trợ động từ do/does.',
      'Slide 3 [Part 2 - Present Continuous]: Actions in progress – Dấu hiệu now, at the moment, today và quy tắc thêm -ing.',
      'Slide 4 [Part 2 - Adverbs of Frequency]: always, usually, often, sometimes, never – Vị trí đứng trước động từ thường, sau "to be".',
      'Slide 5 [Part 3 - Practice & Review]: Pair-work dialogue templates & common mistake checklist for CNTT K26.'
    ],
    mindmapTree: {
      root: 'Tiếng Anh 1 • Unit 1-2 Review',
      branches: [
        {
          id: 'b1',
          title: '1. Present Simple Tense',
          color: 'emerald',
          formula: 'S + V(s/es) | Do/Does + S + V0?',
          items: [
            'Thói quen lặp lại, lịch trình thời khóa biểu',
            'Thêm -es sau ch, sh, o, s, x, z với ngôi số 3 ít',
            'Phủ định dùng don’t / doesn’t + động từ nguyên mẫu',
            'Trạng từ tần suất: always, usually, often, never'
          ]
        },
        {
          id: 'b2',
          title: '2. Present Continuous',
          color: 'sky',
          formula: 'S + am / is / are + V-ing',
          items: [
            'Hành động đang diễn ra tại thời điểm nói',
            'Dấu hiệu: now, right now, at present, Look!',
            'Không dùng với Stative Verbs (know, like, need)',
            'Quy tắc gấp đôi phụ âm cuối (sit -> sitting)'
          ]
        },
        {
          id: 'b3',
          title: '3. Campus & IT Vocabulary',
          color: 'purple',
          formula: 'Major, Semester, Assignment, Lecturer',
          items: [
            'Information Technology (Ngành CNTT), Freshman (SV năm nhất)',
            'Timetable (Thời khóa biểu), Lecture hall (Giảng đường)',
            'Submit an assignment (Nộp bài tập), Attendance (Điểm danh)',
            'Collocations: take notes, attend class, study hard'
          ]
        },
        {
          id: 'b4',
          title: '4. Speaking & Writing Frame',
          color: 'amber',
          formula: 'My major is IT at Tay Nguyen University',
          items: [
            'Giới thiệu họ tên, quê quán, ngành học CNTT K26',
            'Mô tả thời khóa biểu trong tuần bằng thì Hiện tại đơn',
            'Hỏi đáp cặp đôi (Pair-work Q&A) về thói quen học tập',
            'Checklist tránh lỗi quên chia "s/es" & thiếu động từ to-be'
          ]
        }
      ]
    }
  }
];

function loadSavedRecapLectures() {
  try {
    const raw = localStorage.getItem(RECAP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function AiLectureMindmapHub({
  role = 'teacher',
  triggerToast,
  onAiEngineUsed,
  initialFeatureTab = 'ai_generator', // 'ai_generator' | 'course_recap'
  initialTitle = '',
  initialFileName = '',
  initialRawText = ''
}) {
  const [featureTab, setFeatureTab] = useState(initialFeatureTab);

  // Sync feature tab when caller switches between 'mindmap' and 'lecture_recap'
  useEffect(() => {
    setFeatureTab(initialFeatureTab || 'ai_generator');
  }, [initialFeatureTab]);

  // Shared visualizer states
  const [viewMode, setViewMode] = useState('mindmap'); // 'mindmap' | 'infographic'
  const [selectedBranchId, setSelectedBranchId] = useState('b1');
  const [zoomScale, setZoomScale] = useState(1);

  // =========================================================================
  // FEATURE 1: AI TẠO SƠ ĐỒ TƯ DUY & INFOGRAPHIC RIÊNG (CẢ GV & SINH VIÊN)
  // =========================================================================
  const [mindmaps, setMindmaps] = useState(() => {
    const initial = extendedFeaturesService.getAiMindmaps();
    return Array.isArray(initial) && initial.length > 0 ? initial : [DEFAULT_MINDMAP];
  });
  const [activeMap, setActiveMap] = useState(() => {
    const initial = extendedFeaturesService.getAiMindmaps();
    return (Array.isArray(initial) && initial[0]) || DEFAULT_MINDMAP;
  });
  const [uploadTitle, setUploadTitle] = useState(
    () => initialTitle || 'Chương 5: Bảng Băm (Hash Table) & Quy Hoạch Động'
  );
  const [selectedFileName, setSelectedFileName] = useState(
    () => initialFileName || 'Slide_Chuong5_HashTable_DP.pdf'
  );
  const [extractedRawText, setExtractedRawText] = useState(() => initialRawText || '');
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastAiEngineUsed, setLastAiEngineUsed] = useState('');

  useEffect(() => {
    if (initialTitle && initialTitle.trim()) {
      setUploadTitle(initialTitle.trim());
    }
    if (initialFileName && initialFileName.trim()) {
      setSelectedFileName(initialFileName.trim());
    }
    if (initialRawText && initialRawText.trim()) {
      setExtractedRawText(initialRawText.trim());
    }
  }, [initialTitle, initialFileName, initialRawText]);

  useEffect(() => {
    let mounted = true;
    const loadMindmaps = async () => {
      const res = await extendedFeaturesService.fetchAiMindmaps('K26 CNTT - Lớp A');
      if (mounted && Array.isArray(res?.mindmaps) && res.mindmaps.length > 0) {
        setMindmaps(res.mindmaps);
        setActiveMap((prev) => {
          if (!prev) return res.mindmaps[0];
          return res.mindmaps.find((m) => m.id === prev.id) || res.mindmaps[0];
        });
      }
    };
    loadMindmaps();
    const timer = setInterval(loadMindmaps, 6000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [role]);

  // =========================================================================
  // FEATURE 2: TỔNG HỢP BÀI CŨ THEO MÔN (MINDMAP + FILE BÀI GIẢNG ĐÍNH KÈM)
  // =========================================================================
  const [customRecaps, setCustomRecaps] = useState(() => loadSavedRecapLectures());
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');
  const [selectedRecapId, setSelectedRecapId] = useState(CURATED_COURSE_RECAPS[0].id);
  const [showLectureFilePreview, setShowLectureFilePreview] = useState(false);

  // Teacher quick publish state inside Course Recap tab
  const [showPublishRecapForm, setShowPublishRecapForm] = useState(false);
  const [newRecapSubject, setNewRecapSubject] = useState(RECAP_SUBJECTS[1]);
  const [newRecapTitle, setNewRecapTitle] = useState('');
  const [newRecapFileName, setNewRecapFileName] = useState('');
  const [newRecapRawText, setNewRecapRawText] = useState('');
  const [isPublishingRecap, setIsPublishingRecap] = useState(false);

  const allRecaps = useMemo(() => {
    const merged = [...customRecaps, ...CURATED_COURSE_RECAPS];
    const seen = new Set();
    return merged.filter((item) => {
      if (!item?.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [customRecaps]);

  const filteredRecaps = useMemo(() => {
    if (selectedSubjectFilter === 'all') return allRecaps;
    return allRecaps.filter((r) => r.subject === selectedSubjectFilter);
  }, [allRecaps, selectedSubjectFilter]);

  const activeRecap = useMemo(() => {
    return (
      filteredRecaps.find((r) => r.id === selectedRecapId) ||
      filteredRecaps[0] ||
      CURATED_COURSE_RECAPS[0]
    );
  }, [filteredRecaps, selectedRecapId]);

  const parseUploadedFile = async (f, { onParsed }) => {
    if (!f) return;
    setIsParsingFile(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const raw = String(reader.result || '');
          const commaIdx = raw.indexOf(',');
          resolve(commaIdx >= 0 ? raw.slice(commaIdx + 1) : raw);
        };
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });

      const parsedRes = await api.aiMindmaps.parseLessonDoc({
        file_name: f.name,
        file_base64: base64,
        topic: f.name.replace(/\.[^/.]+$/, '')
      });

      const textVal = parsedRes?.extractedText
        ? String(parsedRes.extractedText).trim()
        : await f.text().catch(() => '');
      onParsed({
        fileName: f.name,
        detectedTitle: parsedRes?.detectedTitle || '',
        extractedText: textVal
      });
    } catch {
      const fallbackTxt = await f.text().catch(() => '');
      onParsed({
        fileName: f.name,
        detectedTitle: '',
        extractedText: fallbackTxt
      });
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleGeneratorFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSelectedFileName(f.name);
    const fallbackTitle = `Tóm tắt bài giảng: ${f.name.replace(/\.[^/.]+$/, '')}`;
    setUploadTitle(fallbackTitle);

    parseUploadedFile(f, {
      onParsed: ({ detectedTitle, extractedText }) => {
        setExtractedRawText(extractedText);
        if (detectedTitle) setUploadTitle(detectedTitle);
        triggerToast?.(
          `📄 Đã đọc nội dung từ "${f.name}" — nhấn "AI Tạo Sơ Đồ Tư Duy" để dựng Mindmap & Infographic.`
        );
      }
    });
  };

  const handleRecapFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setNewRecapFileName(f.name);
    if (!newRecapTitle.trim()) {
      setNewRecapTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
    parseUploadedFile(f, {
      onParsed: ({ detectedTitle, extractedText }) => {
        setNewRecapRawText(extractedText);
        if (detectedTitle && !newRecapTitle.trim()) {
          setNewRecapTitle(detectedTitle);
        }
        triggerToast?.(`📄 Đã đính kèm tài liệu bài giảng "${f.name}" để tổng hợp sơ đồ ôn tập.`);
      }
    });
  };

  const handleGenerateMindmap = async (e) => {
    e.preventDefault();
    if (isGenerating || isParsingFile) return;
    if (!uploadTitle.trim() && !selectedFileName.trim()) {
      sound.error?.();
      triggerToast?.('⚠️ Vui lòng nhập chủ đề cần vẽ sơ đồ hoặc chọn tệp PDF/DOCX/PPTX!');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await extendedFeaturesService.generateNewMindmap({
        title: uploadTitle.trim(),
        fileName: selectedFileName.trim(),
        rawText: extractedRawText,
        classId: 'K26 CNTT - Lớp A'
      });

      if (!res?.success || !Array.isArray(res.mindmaps) || res.mindmaps.length === 0) {
        sound.error?.();
        triggerToast?.(`⚠️ ${res?.message || 'Lỗi tạo Sơ đồ Tư duy AI!'}`);
        return;
      }

      const engineUsed = res.aiEngine || res.mindmap?.aiEngine || '';
      if (engineUsed) {
        setLastAiEngineUsed(engineUsed);
        onAiEngineUsed?.(engineUsed);
      }

      setMindmaps(res.mindmaps);
      const nextActive = res.mindmap || res.mindmaps[0];
      setActiveMap(nextActive);
      const firstBranchId = nextActive?.mindmapTree?.branches?.[0]?.id || 'b1';
      setSelectedBranchId(firstBranchId);
      sound.playSuccess?.();
      triggerToast?.(
        `🧠 AI đã tạo xong Sơ đồ Tư duy & Infographic cho "${uploadTitle.trim()}"${engineUsed ? ` • AI: ${engineUsed}` : ''}!`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishCourseRecap = async (e) => {
    e.preventDefault();
    if (isPublishingRecap || isParsingFile) return;
    if (!newRecapTitle.trim()) {
      sound.error?.();
      triggerToast?.('⚠️ Vui lòng nhập tên bài học cần tổng hợp!');
      return;
    }

    setIsPublishingRecap(true);
    try {
      const finalFile = newRecapFileName.trim() || `${newRecapTitle.trim().replace(/\s+/g, '_')}.pptx`;
      const res = await extendedFeaturesService.generateNewMindmap({
        title: newRecapTitle.trim(),
        fileName: finalFile,
        rawText: newRecapRawText,
        classId: 'K26 CNTT - Lớp A'
      });

      const generatedMap = res?.mindmap || DEFAULT_MINDMAP;
      const branches = generatedMap?.mindmapTree?.branches || DEFAULT_MINDMAP.mindmapTree.branches;
      const slidesFromBranches = branches.map(
        (b, idx) =>
          `Slide ${idx + 1} [${b.title}]: ${b.formula || newRecapSubject} – ${(b.items || []).join('; ')}`
      );

      const newRecapItem = {
        id: `RECAP-CUSTOM-${Date.now().toString().slice(-5)}`,
        subject: newRecapSubject,
        lessonLabel: 'Bài giảng mới tổng hợp',
        lectureDate: new Date().toLocaleDateString('vi-VN'),
        lecturer: 'ThS. Phạm Văn Thuận',
        title: newRecapTitle.trim(),
        sourceFileName: finalFile,
        fileSize: `${slidesFromBranches.length} phần • Đính kèm tài liệu`,
        keyTakeaways: generatedMap.keyTakeaways || DEFAULT_MINDMAP.keyTakeaways,
        infographicCards: generatedMap.infographicCards || DEFAULT_MINDMAP.infographicCards,
        lessonSlides:
          slidesFromBranches.length > 0 ? slidesFromBranches : CURATED_COURSE_RECAPS[0].lessonSlides,
        mindmapTree: generatedMap.mindmapTree || DEFAULT_MINDMAP.mindmapTree
      };

      const nextCustom = [newRecapItem, ...customRecaps];
      setCustomRecaps(nextCustom);
      try {
        localStorage.setItem(RECAP_STORAGE_KEY, JSON.stringify(nextCustom));
      } catch {}

      setSelectedSubjectFilter('all');
      setSelectedRecapId(newRecapItem.id);
      setSelectedBranchId(newRecapItem.mindmapTree.branches?.[0]?.id || 'b1');
      setShowPublishRecapForm(false);
      setNewRecapTitle('');
      setNewRecapFileName('');
      setNewRecapRawText('');
      sound.playSuccess?.();
      triggerToast?.(
        `✅ Đã tổng hợp bài cũ "${newRecapItem.title}" môn ${newRecapSubject} kèm file bài giảng để sinh viên ôn tập!`
      );
    } finally {
      setIsPublishingRecap(false);
    }
  };

  const handleDownloadRecapPptx = (recapItem) => {
    if (!recapItem) return;
    try {
      const branches = recapItem.mindmapTree?.branches || [];
      const fallbackSlides = branches.map(
        (b, idx) =>
          `Slide ${idx + 1} [${b.title}]: ${b.formula || recapItem.subject} – ${(b.items || []).join('; ')}`
      );
      const slidesToExport =
        Array.isArray(recapItem.lessonSlides) && recapItem.lessonSlides.length > 0
          ? recapItem.lessonSlides
          : fallbackSlides;

      const quizFromTakeaways = [
        {
          q: `Trọng tâm cốt lõi nhất của bài "${recapItem.title}" (${recapItem.subject}) là gì?`,
          options: [
            `A. ${(recapItem.keyTakeaways || [])[0] || 'Nắm vững nguyên lý và áp dụng vào bài tập thực tế'}`,
            'B. Học thuộc máy móc không cần hiểu bản chất',
            'C. Bỏ qua tài liệu bài giảng của giảng viên',
            'D. Không cần thực hành và kiểm thử'
          ],
          ans: 'A',
          explain: `Được tổng hợp từ file bài giảng ${recapItem.sourceFileName}.`
        }
      ];

      const fileName = exportBloomLessonToPptx({
        title: `${recapItem.subject} — ${recapItem.title}`,
        bloomLevel: `Tổng hợp ôn tập bài cũ (${recapItem.lessonLabel || recapItem.lectureDate})`,
        slideCount: slidesToExport.length,
        sourceFileName: recapItem.sourceFileName,
        slides: slidesToExport,
        quizzes: quizFromTakeaways
      });
      sound.playSuccess?.();
      triggerToast?.(`📥 Đã tải xuống file bài giảng PowerPoint: ${fileName}!`);
    } catch (err) {
      sound.playError?.();
      triggerToast?.(err?.message || 'Không thể xuất file bài giảng .PPTX lúc này.');
    }
  };

  // Shared visualizer renderer for both Features
  const renderMindmapAndInfographicPanel = (mapItem, contextLabel) => {
    const branches =
      Array.isArray(mapItem?.mindmapTree?.branches) && mapItem.mindmapTree.branches.length > 0
        ? mapItem.mindmapTree.branches
        : DEFAULT_MINDMAP.mindmapTree.branches;
    const infographicCards =
      Array.isArray(mapItem?.infographicCards) && mapItem.infographicCards.length > 0
        ? mapItem.infographicCards
        : DEFAULT_MINDMAP.infographicCards;
    const keyTakeaways =
      Array.isArray(mapItem?.keyTakeaways) && mapItem.keyTakeaways.length > 0
        ? mapItem.keyTakeaways
        : DEFAULT_MINDMAP.keyTakeaways;
    const rootLabel = mapItem?.mindmapTree?.root || mapItem?.title || DEFAULT_MINDMAP.mindmapTree.root;
    const activeBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

    return (
      <div className="space-y-4">
        {/* View Mode Switcher: Mindmap vs Infographic */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>{contextLabel}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-view-mode-mindmap"
              type="button"
              onClick={() => setViewMode('mindmap')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                viewMode === 'mindmap'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white dark:bg-[#0c1424] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              🌿 Sơ đồ Tư duy (Mindmap)
            </button>
            <button
              id="btn-view-mode-infographic"
              type="button"
              onClick={() => setViewMode('infographic')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                viewMode === 'infographic'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white dark:bg-[#0c1424] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              📊 Infographic Tóm tắt
            </button>
          </div>
        </div>

        {viewMode === 'mindmap' ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm overflow-hidden">
            {/* Mindmap Zoom Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-500">
                💡 Click vào từng nhánh kiến thức để xem công thức trọng tâm và ý chính chi tiết:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setZoomScale(Math.max(0.85, zoomScale - 0.1))}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold px-2">{Math.round(zoomScale * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoomScale(Math.min(1.15, zoomScale + 0.1))}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                  title="Phóng to"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                  title="Mặc định"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top center' }}
              className="transition-transform duration-300 space-y-3"
            >
              {/* Visual SVG Root & Bezier Connectors */}
              <div className="w-full overflow-x-auto pb-1">
                <div className="flex flex-col items-center min-w-[640px] md:min-w-0">
                  <div className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600 text-white font-black text-sm shadow-lg border-2 border-white/20 text-center max-w-2xl">
                    🎯 Trọng tâm: {rootLabel}
                  </div>

                  <svg className="w-full max-w-5xl h-16 overflow-visible hidden md:block" viewBox="0 0 800 64" fill="none">
                    <path d="M400 0 C400 32, 100 22, 100 64" stroke="#8b5cf6" strokeWidth="2.5" strokeDasharray="4 2" />
                    <path d="M400 0 C400 32, 300 22, 300 64" stroke="#0ea5e9" strokeWidth="2.5" />
                    <path d="M400 0 C400 32, 500 22, 500 64" stroke="#a855f7" strokeWidth="2.5" />
                    <path d="M400 0 C400 32, 700 22, 700 64" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="4 2" />
                    <circle cx="400" cy="4" r="5" fill="#6366f1" />
                    <circle cx="100" cy="60" r="4.5" fill={BRANCH_COLORS[0]} />
                    <circle cx="300" cy="60" r="4.5" fill={BRANCH_COLORS[1]} />
                    <circle cx="500" cy="60" r="4.5" fill={BRANCH_COLORS[2]} />
                    <circle cx="700" cy="60" r="4.5" fill={BRANCH_COLORS[3]} />
                  </svg>
                </div>
              </div>

              {/* 4 Clickable Branch Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {branches.map((branch, idx) => {
                  const isSelected = branch.id === activeBranch?.id;
                  const dotColor = BRANCH_COLORS[idx % BRANCH_COLORS.length];
                  return (
                    <div
                      key={branch.id || idx}
                      onClick={() => setSelectedBranchId(branch.id)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? 'bg-purple-500/10 border-purple-500 shadow-md ring-2 ring-purple-500/20'
                          : 'bg-slate-50 dark:bg-[#090e1a] border-slate-200 dark:border-slate-800 hover:border-purple-400'
                      }`}
                    >
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                          <span>{branch.title}</span>
                        </span>
                        <GitBranch className="w-4 h-4 text-purple-500 shrink-0" />
                      </div>
                      <div className="px-2.5 py-1 rounded-lg bg-slate-900 text-emerald-300 font-mono text-[11px] break-words">
                        {branch.formula || 'Trọng tâm kiến thức'}
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                        {(Array.isArray(branch.items) ? branch.items : []).map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-purple-500 font-bold">├─</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            {activeBranch && (
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-xs space-y-1">
                <div className="font-extrabold text-indigo-800 dark:text-indigo-300">
                  🔍 Nhánh đang xem: {activeBranch.title} — Từ khóa / Công thức:{' '}
                  <span className="font-mono">{activeBranch.formula}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  Sơ đồ tư duy trực quan hóa 4 nhánh kiến thức cốt lõi giúp ghi nhớ nhanh và hệ thống hóa trước kỳ kiểm tra.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Infographic View */
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-teal-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  INFOGRAPHIC TỔNG QUAN • CNTT K26
                </div>
                <h4 className="font-black text-base sm:text-lg mt-0.5">{mapItem.title}</h4>
              </div>
              <span className="px-3 py-1 rounded-xl bg-white/15 border border-white/25 text-xs font-extrabold shrink-0 self-start sm:self-center">
                {branches.length} Nhánh Kiến Thức • {keyTakeaways.length} Trọng Tâm
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {infographicCards.map((card, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-gradient-to-br from-teal-500/10 to-indigo-500/10 border border-teal-500/30 space-y-1.5"
                >
                  <span className="inline-block px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-800 dark:text-[#00dfa2] text-[10px] font-black">
                    {card.badge}
                  </span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono break-words">
                    {card.metric}
                  </div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{card.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-500" />
                <span>4 Điểm Cốt Lõi Cần Nhớ:</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {keyTakeaways.map((pt, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 text-xs font-semibold flex items-start gap-2.5 text-slate-700 dark:text-slate-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>Bản Đồ Tóm Tắt Theo Nhánh Kiến Thức:</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {branches.map((b, idx) => (
                  <div
                    key={b.id || idx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-xs text-indigo-700 dark:text-indigo-300">{b.title}</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-emerald-300 font-mono text-[10px]">
                        {b.formula}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                      {(Array.isArray(b.items) ? b.items : []).map((it, k) => (
                        <div key={k} className="flex items-start gap-1.5">
                          <span className="text-teal-500 font-bold">•</span>
                          <span>{it}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const currentMap = activeMap || mindmaps[0] || DEFAULT_MINDMAP;

  return (
    <div id="module-ai-mindmap-hub" className="mt-0 space-y-5 animate-fadeIn">
      {/* Top Architecture Switcher: Separates (1) Standalone AI Generator vs (2) Subject Past-Lecture Archive */}
      <div className="p-2 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-feature-ai-generator"
            type="button"
            onClick={() => {
              setFeatureTab('ai_generator');
              setSelectedBranchId('b1');
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              featureTab === 'ai_generator'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Tạo Sơ Đồ Tư Duy Riêng</span>
          </button>

          <button
            id="btn-feature-course-recap"
            type="button"
            onClick={() => {
              setFeatureTab('course_recap');
              setSelectedBranchId('b1');
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              featureTab === 'course_recap'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>Tổng Hợp Bài Cũ &amp; File Bài Giảng Theo Môn</span>
          </button>
        </div>

        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25">
          {role === 'teacher' ? 'Chế độ Giảng viên • CNTT K26' : 'Chế độ Sinh viên • Ôn tập & Tự học'}
        </span>
      </div>

      {/* =================================================================== */}
      {/* FEATURE 1: STANDALONE AI MINDMAP & INFOGRAPHIC GENERATOR (ALL ROLES)*/}
      {/* =================================================================== */}
      {featureTab === 'ai_generator' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-cyan-500/10 border border-purple-500/30 space-y-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-500/30">
                    Công Cụ AI Tạo Sơ Đồ Tư Duy Độc Lập
                  </span>
                  {(currentMap?.aiEngine || lastAiEngineUsed) && (
                    <span
                      id="mindmap-ai-engine-badge"
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
                    >
                      AI Engine: {currentMap?.aiEngine || lastAiEngineUsed}
                    </span>
                  )}
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-1">
                  Tạo Sơ Đồ Tư Duy &amp; Infographic Từ Chủ Đề Hoặc Tài Liệu Bất Kỳ
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {role === 'teacher'
                    ? 'Giảng viên tải tệp bài giảng hoặc nhập chủ đề bất kỳ để AI tự động vẽ sơ đồ tư duy đa nhánh & Infographic trực quan.'
                    : 'Sinh viên có thể tự nhập chủ đề muốn ôn tập, dán ghi chú hoặc tải lên file bài tập/tài liệu để AI dựng sơ đồ tư duy riêng.'}
                </p>
              </div>
            </div>

            {/* Quick Suggestion Topic Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Gợi ý nhanh:</span>
              {[
                'Cây AVL & 4 phép xoay cân bằng',
                'Thuật toán Dijkstra vs Floyd-Warshall',
                'Lập trình Python: List, Dict & Hàm',
                'Chuẩn hóa CSDL 1NF, 2NF, 3NF'
              ].map((topicChip) => (
                <button
                  key={topicChip}
                  type="button"
                  onClick={() => {
                    setUploadTitle(topicChip);
                    setSelectedFileName(`${topicChip.replace(/[^a-zA-Z0-9]+/g, '_')}.pdf`);
                  }}
                  className="px-2.5 py-1 rounded-full bg-white/80 dark:bg-[#0c1424] hover:bg-purple-600 hover:text-white border border-purple-500/30 text-[11px] font-bold text-purple-700 dark:text-purple-300 transition-all cursor-pointer"
                >
                  + {topicChip}
                </button>
              ))}
            </div>

            {/* Generator Form — available for BOTH Teacher and Student */}
            <form
              onSubmit={handleGenerateMindmap}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-4 flex items-center gap-2">
                  <label className="px-3 py-2 rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs font-extrabold cursor-pointer shrink-0 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    <span>{isParsingFile ? 'Đang đọc file...' : 'Tải tệp PDF/DOCX'}</span>
                    <input
                      type="file"
                      accept=".pdf,.pptx,.docx,.doc,.txt"
                      onChange={handleGeneratorFileChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs font-mono text-slate-500 truncate" title={selectedFileName}>
                    {selectedFileName}
                  </span>
                </div>

                <div className="md:col-span-5">
                  <input
                    id="input-ai-mindmap-topic"
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Nhập chủ đề hoặc khái niệm bạn muốn AI vẽ sơ đồ tư duy..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="md:col-span-3">
                  <button
                    id="btn-generate-ai-mindmap"
                    type="submit"
                    disabled={isGenerating || isParsingFile}
                    className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-60"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>
                      {isGenerating
                        ? 'Đang tạo sơ đồ...'
                        : isParsingFile
                        ? 'Đang trích xuất...'
                        : 'AI Tạo Sơ Đồ Tư Duy'}
                    </span>
                  </button>
                </div>
              </div>

              <textarea
                rows={2}
                value={extractedRawText}
                onChange={(e) => setExtractedRawText(e.target.value)}
                placeholder="(Tuỳ chọn) Dán nội dung đề cương / ghi chú bài học tại đây để AI phân nhánh chính xác hơn..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200"
              />
            </form>
          </div>

          {/* Saved Generated Mindmaps Switcher */}
          {mindmaps.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-[11px] font-bold text-slate-500 shrink-0">
                Sơ đồ AI đã tạo ({mindmaps.length}):
              </span>
              {mindmaps.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setActiveMap(m);
                    setSelectedBranchId(m?.mindmapTree?.branches?.[0]?.id || 'b1');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer shrink-0 ${
                    currentMap.id === m.id
                      ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                      : 'bg-white dark:bg-[#0c1424] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-purple-400'
                  }`}
                >
                  {m.id}: {String(m.title || '').length > 42 ? `${m.title.slice(0, 42)}...` : m.title}
                </button>
              ))}
            </div>
          )}

          {renderMindmapAndInfographicPanel(
            currentMap,
            `Đang hiển thị: ${currentMap.title} (${currentMap.sourceFileName || 'Chủ đề tự do'})`
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* FEATURE 2: SUBJECT PAST-LECTURE MINDMAP + ATTACHED LECTURE FILES     */}
      {/* =================================================================== */}
      {featureTab === 'course_recap' && (
        <div className="space-y-4">
          {/* Subject Filter & Archive Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-indigo-500/10 border border-teal-500/30 space-y-3 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-800 dark:text-[#00dfa2] border border-teal-500/30">
                  Kho Ôn Tập Bài Cũ Theo Môn Học • CNTT K26
                </span>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white mt-1">
                  Tổng Hợp Bài Giảng Đã Học Bằng Sơ Đồ Tư Duy Kèm File Bài Giảng
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Chọn môn học để xem lại các buổi học trước: mỗi bài cũ được cô đọng bằng sơ đồ tư duy đa nhánh, Infographic và tệp slide bài giảng gốc để xem trực tiếp hoặc tải về (.PPTX).
                </p>
              </div>

              {role === 'teacher' && (
                <button
                  id="btn-toggle-publish-recap"
                  type="button"
                  onClick={() => setShowPublishRecapForm((v) => !v)}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md self-start lg:self-center"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{showPublishRecapForm ? 'Đóng biểu mẫu' : 'Đăng Tổng Hợp Bài Cũ Mới'}</span>
                </button>
              )}
            </div>

            {/* Subject Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setSelectedSubjectFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedSubjectFilter === 'all'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-white dark:bg-[#0c1424] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Tất cả môn học ({allRecaps.length})
              </button>
              {RECAP_SUBJECTS.map((subj) => {
                const count = allRecaps.filter((r) => r.subject === subj).length;
                return (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setSelectedSubjectFilter(subj)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedSubjectFilter === subj
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-white dark:bg-[#0c1424] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-teal-400'
                    }`}
                  >
                    {subj} ({count})
                  </button>
                );
              })}
            </div>

            {/* Teacher Form to Publish Past Lecture Recap + File */}
            {role === 'teacher' && showPublishRecapForm && (
              <form
                onSubmit={handlePublishCourseRecap}
                className="p-4 rounded-2xl bg-white dark:bg-[#0c1424] border border-teal-500/30 grid grid-cols-1 md:grid-cols-12 gap-3 items-center shadow-sm"
              >
                <div className="md:col-span-3">
                  <select
                    value={newRecapSubject}
                    onChange={(e) => setNewRecapSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100"
                  >
                    {RECAP_SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-4">
                  <input
                    type="text"
                    value={newRecapTitle}
                    onChange={(e) => setNewRecapTitle(e.target.value)}
                    placeholder="Tên buổi học cũ (VD: Buổi 3 - Hàm & Đệ quy)..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="md:col-span-3 flex items-center gap-2">
                  <label className="px-3 py-2 rounded-xl bg-teal-500/15 text-teal-700 dark:text-[#00dfa2] border border-teal-500/30 text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Đính kèm File</span>
                    <input
                      type="file"
                      accept=".pdf,.pptx,.docx,.doc,.txt"
                      onChange={handleRecapFileChange}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] font-mono text-slate-500 truncate">
                    {newRecapFileName || 'Chưa chọn tệp'}
                  </span>
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={isPublishingRecap || isParsingFile}
                    className="w-full px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-extrabold cursor-pointer disabled:opacity-60"
                  >
                    {isPublishingRecap ? 'Đang tạo...' : 'Xuất bản Bài cũ'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Past Lecture Cards Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredRecaps.map((item) => {
              const isSelected = activeRecap?.id === item.id;
              return (
                <button
                  key={item.id}
                  id={`btn-recap-card-${item.id}`}
                  type="button"
                  onClick={() => {
                    setSelectedRecapId(item.id);
                    setSelectedBranchId(item.mindmapTree?.branches?.[0]?.id || 'b1');
                    setShowLectureFilePreview(false);
                  }}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-teal-500/10 border-teal-500 shadow-md ring-2 ring-teal-500/20'
                      : 'bg-white dark:bg-[#0c1424] border-slate-200 dark:border-slate-800 hover:border-teal-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[10px] font-black">
                      {item.subject}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {item.lectureDate}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2">
                    {item.title}
                  </h4>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1 truncate max-w-[65%]">
                      <FolderOpen className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className="truncate font-mono">{item.sourceFileName}</span>
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                      <UserCheck className="w-3 h-3" /> {item.lecturer}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Attached Lecture File Card + Slide Reader + PPTX Download */}
          {activeRecap && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1424] border border-teal-500/30 space-y-4 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-500/20 text-teal-800 dark:text-[#00dfa2]">
                      {activeRecap.subject}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {activeRecap.lessonLabel} • {activeRecap.lecturer}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    📎 File Bài Giảng Đính Kèm: <span className="font-mono text-teal-700 dark:text-[#00dfa2]">{activeRecap.sourceFileName}</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeRecap.fileSize || 'Tài liệu bài giảng chuẩn hóa'} • Sinh viên có thể đọc trực tiếp từng slide hoặc tải về dạng PowerPoint (.PPTX) để tự ôn tập.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    id="btn-toggle-recap-slides"
                    type="button"
                    onClick={() => setShowLectureFilePreview((v) => !v)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                  >
                    {showLectureFilePreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{showLectureFilePreview ? 'Ẩn Nội Dung Slide' : 'Xem Nội Dung File Bài Giảng'}</span>
                  </button>

                  <button
                    id="btn-download-recap-pptx"
                    type="button"
                    onClick={() => handleDownloadRecapPptx(activeRecap)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải File Bài Giảng (.PPTX)</span>
                  </button>
                </div>
              </div>

              {/* Expandable Lecture File Content Preview */}
              {showLectureFilePreview && Array.isArray(activeRecap.lessonSlides) && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 space-y-2.5 animate-fadeIn">
                  <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span>Nội dung tóm lược từ file {activeRecap.sourceFileName}:</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {activeRecap.lessonSlides.map((slideTxt, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white dark:bg-[#0c1424] border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
                      >
                        {slideTxt}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mindmap & Infographic of Selected Past Lecture */}
          {activeRecap &&
            renderMindmapAndInfographicPanel(
              activeRecap,
              `Sơ đồ Tổng hợp Bài cũ: ${activeRecap.subject} • ${activeRecap.title}`
            )}
        </div>
      )}
    </div>
  );
}
