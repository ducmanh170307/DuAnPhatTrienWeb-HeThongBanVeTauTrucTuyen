// ============================================================================
// THÀNH VIÊN 1: QUẢN LÝ STATE, LOCALSTORAGE, ĐIỀU HƯỚNG TAB & TÌM KIẾM/LỌC TÀU
// ============================================================================

window.VietRail = window.VietRail || {};

VietRail.STATIONS = ["Hà Nội", "Vinh", "Huế", "Đà Nẵng", "Nha Trang", "Sài Gòn"];

VietRail.DEFAULT_TRAINS = [
  { id: "SE1", name: "Tàu tốc hành SE1", from: "Hà Nội", to: "Sài Gòn", date: "2026-11-01", departTime: "19:30", arriveTime: "05:30", basePrice: 850000, type: "Tàu nhanh SE", bookedSeats: ["1-1A", "1-1B", "2-3C", "3-2A"] },
  { id: "SE3", name: "Tàu chất lượng cao SE3", from: "Hà Nội", to: "Đà Nẵng", date: "2026-11-01", departTime: "22:00", arriveTime: "11:15", basePrice: 620000, type: "Tàu chất lượng cao", bookedSeats: ["1-2A", "1-2B", "2-1D"] },
  { id: "SE2", name: "Tàu tốc hành SE2", from: "Sài Gòn", to: "Hà Nội", date: "2026-11-01", departTime: "20:30", arriveTime: "06:45", basePrice: 870000, type: "Tàu nhanh SE", bookedSeats: ["1-4A", "3-1B"] },
  { id: "TN1", name: "Tàu Thống Nhất TN1", from: "Hà Nội", to: "Vinh", date: "2026-11-01", departTime: "06:15", arriveTime: "12:00", basePrice: 310000, type: "Tàu thường TN", bookedSeats: ["1-1C"] }
];

VietRail.DEFAULT_BOOKINGS = [
  {
    ticketId: "VR90123",
    trainId: "SE1",
    route: "Hà Nội → Sài Gòn",
    date: "2026-11-01",
    departTime: "19:30",
    coach: 1,
    seatCode: "1-1A",
    passengerName: "Trần Đức Mạnh",
    cccd: "001205012345",
    phone: "0987654321",
    email: "manh@cmc.edu.vn",
    passengerType: "Sinh viên",
    finalPrice: 765000,
    status: "Đã thanh toán"
  }
];

VietRail.state = {
  trains: [],
  bookings: [],
  selectedTrainId: "SE1",
  selectedCoach: 1,
  cart: [],
  voucherCode: null,
  voucherDiscountRate: 0
};

// Định dạng tiền VNĐ
VietRail.formatCurrency = function (amount) {
  return Number(amount || 0).toLocaleString("vi-VN") + " đ";
};

// Hiển thị Toast thông báo UX
VietRail.showToast = function (message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
};

// Đọc/Ghi LocalStorage
VietRail.loadStorage = function () {
  const savedTrains = localStorage.getItem("VIETRAIL_TRAINS");
  const savedBookings = localStorage.getItem("VIETRAIL_BOOKINGS");
  VietRail.state.trains = savedTrains ? JSON.parse(savedTrains) : structuredClone(VietRail.DEFAULT_TRAINS);
  VietRail.state.bookings = savedBookings ? JSON.parse(savedBookings) : structuredClone(VietRail.DEFAULT_BOOKINGS);
};

VietRail.saveStorage = function () {
  localStorage.setItem("VIETRAIL_TRAINS", JSON.stringify(VietRail.state.trains));
  localStorage.setItem("VIETRAIL_BOOKINGS", JSON.stringify(VietRail.state.bookings));
  VietRail.updateBadgeCounts();
};

VietRail.resetDemoData = function () {
  localStorage.removeItem("VIETRAIL_TRAINS");
  localStorage.removeItem("VIETRAIL_BOOKINGS");
  VietRail.state.cart = [];
  VietRail.loadStorage();
  VietRail.saveStorage();
  VietRail.showAllTrains();
  VietRail.renderSeatMap();
  VietRail.renderCart();
  VietRail.renderTicketTable();
  VietRail.renderAdminSection();
  VietRail.showToast("Đã khôi phục dữ liệu mẫu mặc định!", "info");
};

// Chuyển đổi Tab
VietRail.switchTab = function (tabName) {
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));

  document.getElementById(`tab-${tabName}`).classList.add("active");
  const idx = tabName === "booking" ? 0 : tabName === "tickets" ? 1 : 2;
  document.querySelectorAll(".nav-btn")[idx].classList.add("active");

  if (tabName === "tickets") VietRail.renderTicketTable();
  if (tabName === "admin") VietRail.renderAdminSection();
};

VietRail.updateBadgeCounts = function () {
  const activeCount = VietRail.state.bookings.filter(b => b.status === "Đã thanh toán").length;
  document.getElementById("nav-ticket-count").textContent = activeCount;
};

// Đổ danh sách nhà ga vào các thẻ <select>
VietRail.populateStationSelects = function () {
  const selects = ["search-from", "search-to", "admin-from", "admin-to"];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const isSearch = id.startsWith("search-");
    el.innerHTML = isSearch ? `<option value="ALL">-- Tất cả ga --</option>` : "";
    VietRail.STATIONS.forEach(st => {
      el.innerHTML += `<option value="${st}">${st}</option>`;
    });
  });
  document.getElementById("admin-from").value = "Hà Nội";
  document.getElementById("admin-to").value = "Sài Gòn";
};

// Tìm kiếm, Lọc và Sắp xếp danh sách chuyến tàu
VietRail.filterAndRenderTrains = function (e) {
  if (e) e.preventDefault();
  const from = document.getElementById("search-from").value;
  const to = document.getElementById("search-to").value;
  const date = document.getElementById("search-date").value;
  const type = document.getElementById("filter-type").value;
  const sortBy = document.getElementById("sort-by").value;
  const errEl = document.getElementById("search-error");
  errEl.textContent = "";

  // Validate Ga đi trùng Ga đến
  if (from !== "ALL" && to !== "ALL" && from === to) {
    errEl.textContent = "⚠️ Ga đi và Ga đến không được trùng nhau!";
    return;
  }

  let results = VietRail.state.trains.filter(t => {
    const matchFrom = from === "ALL" || t.from === from;
    const matchTo = to === "ALL" || t.to === to;
    const matchDate = !date || t.date === date;
    const matchType = type === "ALL" || t.type === type;
    return matchFrom && matchTo && matchDate && matchType;
  });

  // Sắp xếp
  const totalSeatsPerTrain = 84; // 3 toa x 28 ghế
  results.sort((a, b) => {
    if (sortBy === "price-asc") return a.basePrice - b.basePrice;
    if (sortBy === "price-desc") return b.basePrice - a.basePrice;
    if (sortBy === "time-asc") return a.departTime.localeCompare(b.departTime);
    if (sortBy === "seat-desc") {
      const freeA = totalSeatsPerTrain - a.bookedSeats.length;
      const freeB = totalSeatsPerTrain - b.bookedSeats.length;
      return freeB - freeA;
    }
    return 0;
  });

  VietRail.renderTrainCards(results);
};

VietRail.showAllTrains = function () {
  document.getElementById("search-from").value = "ALL";
  document.getElementById("search-to").value = "ALL";
  document.getElementById("search-date").value = "";
  document.getElementById("filter-type").value = "ALL";
  document.getElementById("search-error").textContent = "";
  VietRail.filterAndRenderTrains();
};

VietRail.renderTrainCards = function (trains) {
  const listEl = document.getElementById("train-list");
  document.getElementById("train-result-count").textContent = `${trains.length} chuyến`;

  if (trains.length === 0) {
    listEl.innerHTML = `<div class="empty-state">Không tìm thấy chuyến tàu nào phù hợp. Hãy bấm "Hiện tất cả".</div>`;
    return;
  }

  listEl.innerHTML = trains.map(t => {
    const isSelected = t.id === VietRail.state.selectedTrainId;
    const freeSeats = 84 - t.bookedSeats.length;
    return `
      <div class="train-card ${isSelected ? "active" : ""}" onclick="VietRail.selectTrain('${t.id}')">
        <div class="train-card-top">
          <span class="train-code">${t.id}</span>
          <span class="train-type-badge">${t.type}</span>
        </div>
        <h4>${t.name}</h4>
        <div class="train-route">
          <strong>${t.from}</strong> <span>(${t.departTime})</span> ➝ <strong>${t.to}</strong> <span>(${t.arriveTime})</span>
        </div>
        <div class="train-card-bottom">
          <span>📅 ${t.date} | Trống: <b>${freeSeats}/84</b></span>
          <span class="train-price">${VietRail.formatCurrency(t.basePrice)}</span>
        </div>
      </div>
    `;
  }).join("");
};

VietRail.selectTrain = function (trainId) {
  VietRail.state.selectedTrainId = trainId;
  VietRail.state.selectedCoach = 1;
  VietRail.filterAndRenderTrains();
  VietRail.renderSeatMap();
};

// Khởi chạy ứng dụng khi DOM tải xong
document.addEventListener("DOMContentLoaded", () => {
  VietRail.loadStorage();
  VietRail.populateStationSelects();
  VietRail.updateBadgeCounts();

  document.getElementById("search-form").addEventListener("submit", VietRail.filterAndRenderTrains);
  document.getElementById("filter-type").addEventListener("change", VietRail.filterAndRenderTrains);
  document.getElementById("sort-by").addEventListener("change", VietRail.filterAndRenderTrains);

  VietRail.showAllTrains();
  if (VietRail.renderSeatMap) VietRail.renderSeatMap();
  if (VietRail.renderCart) VietRail.renderCart();
});