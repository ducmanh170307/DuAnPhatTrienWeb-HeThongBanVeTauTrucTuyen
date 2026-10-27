window.VietRail = window.VietRail || {};

VietRail.renderAdminSection = function () {
  // 1. Thống kê tổng quan
  const paidBookings = VietRail.state.bookings.filter(b => b.status === "Đã thanh toán");
  const totalRevenue = paidBookings.reduce((sum, b) => sum + b.finalPrice, 0);
  const totalBookedSeats = VietRail.state.trains.reduce((sum, t) => sum + t.bookedSeats.length, 0);

  document.getElementById("admin-stats").innerHTML = `
    <div class="stat-box"><span>Tổng số chuyến tàu</span><h3>${VietRail.state.trains.length} chuyến</h3></div>
    <div class="stat-box"><span>Tổng số vé đang hiệu lực</span><h3>${paidBookings.length} vé</h3></div>
    <div class="stat-box"><span>Tổng số ghế đã lấp đầy</span><h3>${totalBookedSeats} ghế</h3></div>
    <div class="stat-box"><span>Tổng doanh thu bán vé</span><h3 style="color:#16a34a">${VietRail.formatCurrency(totalRevenue)}</h3></div>
  `;

  // 2. Bảng danh sách chuyến tàu
  const tbody = document.getElementById("admin-train-tbody");
  tbody.innerHTML = VietRail.state.trains.map(t => `
    <tr>
      <td><strong>${t.id}</strong><br><small>${t.type}</small></td>
      <td><b>${t.name}</b><br><small>${t.from} ➝ ${t.to}</small></td>
      <td>${t.date}<br><small>${t.departTime} - ${t.arriveTime}</small></td>
      <td><strong style="color:#dc2626">${VietRail.formatCurrency(t.basePrice)}</strong></td>
      <td>${t.bookedSeats.length}/84 ghế</td>
      <td>
        <button class="btn-secondary" onclick="VietRail.loadTrainToForm('${t.id}')">✏️ Sửa</button>
        <button class="btn-danger" onclick="VietRail.deleteTrain('${t.id}')">🗑️ Xóa</button>
      </td>
    </tr>
  `).join("");
};

VietRail.loadTrainToForm = function (trainId) {
  const t = VietRail.state.trains.find(item => item.id === trainId);
  if (!t) return;

  document.getElementById("edit-train-mode").value = "EDIT";
  document.getElementById("admin-form-title").textContent = `✏️ Cập nhật chuyến tàu ${t.id}`;
  const idInput = document.getElementById("admin-train-id");
  idInput.value = t.id;
  idInput.readOnly = true;

  document.getElementById("admin-train-name").value = t.name;
  document.getElementById("admin-from").value = t.from;
  document.getElementById("admin-to").value = t.to;
  document.getElementById("admin-date").value = t.date;
  document.getElementById("admin-type").value = t.type;
  document.getElementById("admin-depart").value = t.departTime;
  document.getElementById("admin-arrive").value = t.arriveTime;
  document.getElementById("admin-price").value = t.basePrice;
};

VietRail.resetAdminForm = function () {
  document.getElementById("admin-train-form").reset();
  document.getElementById("edit-train-mode").value = "ADD";
  document.getElementById("admin-form-title").textContent = "➕ Thêm chuyến tàu mới";
  document.getElementById("admin-train-id").readOnly = false;
  document.getElementById("admin-form-error").textContent = "";
};

VietRail.deleteTrain = function (trainId) {
  const train = VietRail.state.trains.find(t => t.id === trainId);
  if (!train) return;

  if (train.bookedSeats.length > 0) {
    VietRail.showToast(`Không thể xóa tàu ${trainId} vì đang có ${train.bookedSeats.length} ghế đã đặt!`, "error");
    return;
  }

  VietRail.state.trains = VietRail.state.trains.filter(t => t.id !== trainId);
  VietRail.saveStorage();
  VietRail.renderAdminSection();
  VietRail.showAllTrains();
  VietRail.showToast(`Đã xóa chuyến tàu ${trainId} khỏi hệ thống!`);
};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("admin-train-form").addEventListener("submit", function (e) {
    e.preventDefault();
    const mode = document.getElementById("edit-train-mode").value;
    const id = document.getElementById("admin-train-id").value.trim().toUpperCase();
    const name = document.getElementById("admin-train-name").value.trim();
    const from = document.getElementById("admin-from").value;
    const to = document.getElementById("admin-to").value;
    const date = document.getElementById("admin-date").value;
    const type = document.getElementById("admin-type").value;
    const departTime = document.getElementById("admin-depart").value;
    const arriveTime = document.getElementById("admin-arrive").value;
    const basePrice = Number(document.getElementById("admin-price").value);
    const errEl = document.getElementById("admin-form-error");

    if (!id || !name || !date || !departTime || !arriveTime || basePrice < 50000) {
      errEl.textContent = "⚠️ Vui lòng nhập đầy đủ thông tin và giá vé tối thiểu từ 50.000đ!";
      return;
    }
    if (from === to) {
      errEl.textContent = "⚠️ Ga đi và Ga đến không được trùng nhau!";
      return;
    }

    if (mode === "ADD") {
      if (VietRail.state.trains.some(t => t.id === id)) {
        errEl.textContent = `⚠️ Mã tàu ${id} đã tồn tại trên hệ thống!`;
        return;
      }
      VietRail.state.trains.push({ id, name, from, to, date, departTime, arriveTime, basePrice, type, bookedSeats: [] });
      VietRail.showToast(`Đã thêm chuyến tàu ${id} thành công!`);
    } else {
      const existing = VietRail.state.trains.find(t => t.id === id);
      if (existing) {
        Object.assign(existing, { name, from, to, date, departTime, arriveTime, basePrice, type });
        VietRail.showToast(`Đã cập nhật chuyến tàu ${id} thành công!`);
      }
    }

    VietRail.saveStorage();
    VietRail.resetAdminForm();
    VietRail.renderAdminSection();
    VietRail.showAllTrains();
  });
});