window.VietRail = window.VietRail || {};

VietRail.COACH_CONFIG = [
  { number: 1, name: "Toa 1: Ngồi mềm điều hòa (Giá gốc)", multiplier: 1.0, isVip: false },
  { number: 2, name: "Toa 2: Giường nằm Khoang 6 (+25%)", multiplier: 1.25, isVip: false },
  { number: 3, name: "Toa 3: Giường nằm VIP Khoang 4 (+50%)", multiplier: 1.5, isVip: true }
];

VietRail.holdSeconds = 300;
VietRail.holdInterval = null;

VietRail.renderSeatMap = function () {
  const train = VietRail.state.trains.find(t => t.id === VietRail.state.selectedTrainId) || VietRail.state.trains[0];
  if (!train) return;

  VietRail.state.selectedTrainId = train.id;
  document.getElementById("selected-train-title").textContent = `Sơ đồ chỗ ngồi - ${train.id} (${train.from} ➝ ${train.to})`;

  // Render 3 nút chọn Toa
  const tabsEl = document.getElementById("coach-tabs");
  tabsEl.innerHTML = VietRail.COACH_CONFIG.map(c => `
    <button class="coach-tab ${VietRail.state.selectedCoach === c.number ? "active" : ""}"
            onclick="VietRail.selectCoach(${c.number})">
      ${c.name}
    </button>
  `).join("");

  // Render 7 hàng ghế (mỗi hàng 4 ghế A, B - lối đi - C, D = 28 ghế/toa)
  const coachInfo = VietRail.COACH_CONFIG.find(c => c.number === VietRail.state.selectedCoach);
  const container = document.getElementById("coach-container");
  let colsHtml = "";

  for (let row = 1; row <= 7; row++) {
    const seats = ["A", "B", "AISLE", "C", "D"].map(letter => {
      if (letter === "AISLE") return `<div class="aisle-divider">LỐI ĐI</div>`;
      const seatCode = `${coachInfo.number}-${row}${letter}`;
      const isBooked = train.bookedSeats.includes(seatCode);
      const inCart = VietRail.state.cart.some(item => item.trainId === train.id && item.seatCode === seatCode);

      let cls = "seat-btn";
      if (coachInfo.isVip) cls += " vip";
      if (inCart) cls += " selecting";
      if (isBooked) cls += " booked";

      return `<button class="${cls}" ${isBooked ? "disabled" : ""}
                onclick="VietRail.toggleSeat('${train.id}', ${coachInfo.number}, '${seatCode}', ${coachInfo.multiplier})">
                ${row}${letter}
              </button>`;
    }).join("");

    colsHtml += `<div class="seat-col">${seats}</div>`;
  }

  container.innerHTML = `<div class="seat-grid">${colsHtml}</div>`;
};

VietRail.selectCoach = function (coachNum) {
  VietRail.state.selectedCoach = coachNum;
  VietRail.renderSeatMap();
};

VietRail.toggleSeat = function (trainId, coachNumber, seatCode, multiplier) {
  const train = VietRail.state.trains.find(t => t.id === trainId);
  if (!train || train.bookedSeats.includes(seatCode)) return;

  const existingIndex = VietRail.state.cart.findIndex(i => i.trainId === trainId && i.seatCode === seatCode);
  if (existingIndex > -1) {
    VietRail.state.cart.splice(existingIndex, 1);
  } else {
    if (VietRail.state.cart.length >= 6) {
      VietRail.showToast("Mỗi giao dịch chỉ được giữ tối đa 6 ghế!", "error");
      return;
    }
    VietRail.state.cart.push({
      trainId: train.id,
      route: `${train.from} → ${train.to}`,
      date: train.date,
      departTime: train.departTime,
      coach: coachNumber,
      seatCode,
      baseSeatPrice: Math.round(train.basePrice * multiplier),
      passengerType: "Người lớn"
    });
    VietRail.startHoldTimer();
  }

  if (VietRail.state.cart.length === 0) VietRail.stopHoldTimer();
  VietRail.renderSeatMap();
  VietRail.renderCart();
};

// Đồng hồ đếm ngược 5 phút giữ chỗ (Tiêu chí Sáng tạo 0,5đ)
VietRail.startHoldTimer = function () {
  VietRail.holdSeconds = 300;
  document.getElementById("hold-timer-box").classList.remove("hidden");
  if (VietRail.holdInterval) clearInterval(VietRail.holdInterval);

  VietRail.holdInterval = setInterval(() => {
    VietRail.holdSeconds--;
    const m = String(Math.floor(VietRail.holdSeconds / 60)).padStart(2, "0");
    const s = String(VietRail.holdSeconds % 60).padStart(2, "0");
    document.getElementById("hold-timer").textContent = `${m}:${s}`;

    if (VietRail.holdSeconds <= 0) {
      VietRail.state.cart = [];
      VietRail.stopHoldTimer();
      VietRail.renderSeatMap();
      VietRail.renderCart();
      VietRail.showToast("Đã hết 5 phút giữ chỗ! Ghế trong giỏ đã được giải phóng.", "error");
    }
  }, 1000);
};

VietRail.stopHoldTimer = function () {
  if (VietRail.holdInterval) clearInterval(VietRail.holdInterval);
  document.getElementById("hold-timer-box").classList.add("hidden");
};