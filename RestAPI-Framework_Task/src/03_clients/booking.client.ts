import { APIRequestContext, APIResponse } from '@playwright/test';
import { BookingRequest } from '../02_types/booking.types';

export class BookingClient {
  constructor(private readonly request: APIRequestContext) {}

  async getAllBookings(): Promise<APIResponse> {
    return this.request.get('/booking');
  }

  async getBookingById(id: number): Promise<APIResponse> {
    return this.request.get(`/booking/${id}`);
  }

  async createBooking(body: BookingRequest): Promise<APIResponse> {
    return this.request.post('/booking', { data: body });
  }

  async updateBooking(id: number, body: BookingRequest, token: string): Promise<APIResponse> {
    return this.request.put(`/booking/${id}`, {
      data: body,
      headers: { 'Cookie': `token=${token}` }
    });
  }

  async partialUpdateBooking(id: number, fields: Partial<BookingRequest>, token: string): Promise<APIResponse> {
    return this.request.patch(`/booking/${id}`, {
      data: fields,
      headers: { 'Cookie': `token=${token}` }
    });
  }

  async deleteBooking(id: number, token: string): Promise<APIResponse> {
    return this.request.delete(`/booking/${id}`, {
      headers: { 'Cookie': `token=${token}` }
    });
  }

  async deleteBookingNoToken(id: number): Promise<APIResponse> {
    return this.request.delete(`/booking/${id}`);
  }

  async getBookingsByFilter(params: Record<string, string>): Promise<APIResponse> {
    return this.request.get('/booking', { params });
  }
}
