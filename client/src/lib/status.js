export const BOOKING_STATUS = {
  confirmed: { label: 'Confirmed', tone: 'info' },
  checked_in: { label: 'Checked in', tone: 'felt' },
  completed: { label: 'Played', tone: 'ok' },
  cancelled: { label: 'Cancelled', tone: 'bad' },
  no_show: { label: 'No-show', tone: 'warn' },
};

export const PAYMENT_STATUS = {
  unpaid: { label: 'Pay at venue', tone: 'warn' },
  paid: { label: 'Paid', tone: 'ok' },
  refunded: { label: 'Refunded', tone: 'info' },
};

export const ENQUIRY_STATUS = {
  new: { label: 'New', tone: 'warn' },
  in_progress: { label: 'In progress', tone: 'info' },
  closed: { label: 'Closed', tone: 'ok' },
};
