export interface BookingDates {
  checkin: string;
  checkout: string;
}

export interface BookingRequest {
  firstname: string;
  lastname: string;
  totalprice: number;
  depositpaid: boolean;
  bookingdates: BookingDates;
  additionalneeds: string;
}

export interface BookingResponse {
  bookingid: number;
  booking: BookingRequest;
}

export interface BookingId {
  bookingid: number;
}
