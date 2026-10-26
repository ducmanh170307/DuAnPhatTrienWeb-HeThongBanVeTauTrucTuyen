
window.VietRail = window.VietRail || {};

VietRail.renderTicketTable = function () {
  const tbody = document.getElementById("ticket-table-body");
  const keyword = (document.getElementById("ticket-search")?.value || "").trim().toLowerCase();
  const statusFilter = document.getElementById("ticket-status-filter")?.value || "ALL";

  const filtered = VietRail.state.bookings.filter(b => {
    const matchKey = !keyword ||
      b.ticketId.toLowerCase().includes(keyword) ||
      b.passengerName.toLowerCase().includes(keyword) ||
      b.phone.includes(keyword) ||
      b.cccd.includes(keyword);
    const matchStatus = statusFilter === "ALL" || b.status === statusFilter;
    return matchKey && matchStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#64748b;">Không có vé nào khớp với điều kiện tra cứu.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(b => `
    <tr>
      <td><strong>${b.ticketId}</strong></td>
      <td><b>${b.trainId}</b> (${b.route})<br><small>${b.date} - ${b.departTime}</small></td>
      <td>Toa ${b.coach} - Ghế <b>${b.seatCode}</b></td>
      <td>${b.passengerName}<br><small>SĐT: ${b.phone} | CCCD: ${b.cccd}</small></td>
      <td>${b.passengerType}</td>
      <td><strong style="color:#dc2626">${VietRail.formatCurrency(b.finalPrice)}</strong></td>
      <td><span class="badge">${b.status}</span></td>
      <td>
        <button class="btn-secondary" onclick="VietRail.openBoardingPass('${b.ticketId}')">🖨️ Vé QR</button>
        ${b.status === "Đã thanh toán" ? `
          <button class="btn-secondary" onclick="VietRail.openEditTicketModal('${b.ticketId}')">✏️ Sửa</button>
          <button class="btn-danger" onclick="VietRail.cancelTicket('${b.ticketId}')">Hủy vé</button>
        ` : ""}
      </td>
    </tr>
  `).join("");
};

// Sửa thông tin vé (Update trong CRUD)
VietRail.openEditTicketModal = function (ticketId) {
  const ticket = VietRail.state.bookings.find(b => b.ticketId === ticketId);
  if (!ticket) return;

  const modal = document.getElementById("ticket-modal");
  const box = document.getElementById("ticket-modal-content");
  modal.classList.remove("hidden");

  box.innerHTML = `
    <h3>✏️ Cập nhật thông tin Vé ${ticket.ticketId}</h3>
    <div class="form-group" style="margin-top:12px;">
      <label>Họ và tên hành khách</label>
      <input type="text" id="edit-t-name" value="${ticket.passengerName}">
    </div>
    <div class="form-group">
      <label>Số điện thoại</label>
      <input type="text" id="edit-t-phone" value="${ticket.phone}">
    </div>
    <div class="form-group">
      <label>Đối tượng ưu đãi (Tự động tính lại giá vé)</label>
      <select id="edit-t-type">
        ${Object.keys(VietRail.PASSENGER_DISCOUNTS).map(t =>
          `<option value="${t}" ${ticket.passengerType === t ? "selected" : ""}>${t}</option>`
        ).join("")}
      </select>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;">
      <button class="btn-primary" onclick="VietRail.saveEditedTicket('${ticket.ticketId}')">Lưu thay đổi</button>
      <button class="btn-secondary" onclick="VietRail.closeModal()">Đóng</button>
    </div>
  `;
};

VietRail.saveEditedTicket = function (ticketId) {
  const ticket = VietRail.state.bookings.find(b => b.ticketId === ticketId);
  if (!ticket) return;

  const newName = document.getElementById("edit-t-name").value.trim();
  const newPhone = document.getElementById("edit-t-phone").value.trim();
  const newType = document.getElementById("edit-t-type").value;

  if (newName.length < 3 || !/^0\d{9}$/.test(newPhone)) {
    VietRail.showToast("Họ tên hoặc SĐT 10 số không hợp lệ!", "error");
    return;
  }

  // Tính lại giá dựa trên chuyến tàu và toa
  const train = VietRail.state.trains.find(t => t.id === ticket.trainId);
  const coachCfg = VietRail.COACH_CONFIG.find(c => c.number === Number(ticket.coach)) || { multiplier: 1 };
  const basePrice = train ? train.basePrice * coachCfg.multiplier : ticket.finalPrice;
  const discount = VietRail.PASSENGER_DISCOUNTS[newType] || 0;

  ticket.passengerName = newName;
  ticket.phone = newPhone;
  ticket.passengerType = newType;
  ticket.finalPrice = Math.round(basePrice * (1 - discount));

  VietRail.saveStorage();
  VietRail.closeModal();
  VietRail.renderTicketTable();
  VietRail.showToast(`Đã cập nhật vé ${ticketId} thành công!`);
};

// Hủy vé & Nhả ghế về sơ đồ toa tàu (Delete trong CRUD)
VietRail.cancelTicket = function (ticketId) {
  const ticket = VietRail.state.bookings.find(b => b.ticketId === ticketId);
  if (!ticket) return;

  ticket.status = "Đã hủy";
  const train = VietRail.state.trains.find(t => t.id === ticket.trainId);
  if (train) {
    train.bookedSeats = train.bookedSeats.filter(s => s !== ticket.seatCode);
  }

  VietRail.saveStorage();
  VietRail.renderTicketTable();
  VietRail.renderSeatMap();
  VietRail.showToast(`Đã hủy vé ${ticketId} và mở trống lại ghế ${ticket.seatCode}!`, "info");
};

// Xuất vé điện tử Boarding Pass kèm mã QR
VietRail.openBoardingPass = function (ticketId) {
  const t = VietRail.state.bookings.find(b => b.ticketId === ticketId);
  if (!t) return;

  const modal = document.getElementById("ticket-modal");
  const box = document.getElementById("ticket-modal-content");
  modal.classList.remove("hidden");

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
    `VIETRAIL|${t.ticketId}|${t.trainId}|${t.seatCode}|${t.passengerName}`
  )}`;

  box.innerHTML = `
    <div style="border:2px dashed #1d4ed8;padding:16px;border-radius:12px;">
      <h3 style="color:#1d4ed8;">🚆 THẺ LÊN TÀU HỎA (BOARDING PASS)</h3>
      <p style="font-size:13px;color:#64748b;margin-bottom:12px;">Mã vé: <strong>${t.ticketId}</strong> | Trạng thái: <b>${t.status}</b></p>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
        <div style="font-size:14px;line-height:1.7;">
          <div>Hành khách: <strong>${t.passengerName}</strong> (${t.passengerType})</div>
          <div>CCCD: ${t.cccd} | SĐT: ${t.phone}</div>
          <div>Hành trình: <strong>${t.trainId} (${t.route})</strong></div>
          <div>Khởi hành: <b>${t.departTime}</b> ngày <b>${t.date}</b></div>
          <div>Vị trí: <strong>Toa ${t.coach} - Ghế ${t.seatCode}</strong></div>
          <div>Giá vé: <strong style="color:#dc2626">${VietRail.formatCurrency(t.finalPrice)}</strong></div>
        </div>
        <img src="${qrUrl}" alt="QR Ticket" width="130" height="130">
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;">
      <button class="btn-primary" onclick="window.print()">🖨️ In vé điện tử</button>
      <button class="btn-secondary" onclick="VietRail.closeModal()">Đóng</button>
    </div>
  `;
};

VietRail.closeModal = function () {
  document.getElementById("ticket-modal").classList.add("hidden");
};