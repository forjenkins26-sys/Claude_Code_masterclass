import { expect } from '@playwright/test';
import { BookingClient } from '../03_clients/booking.client';
import { BookingRequest, BookingResponse } from '../02_types/booking.types';

export class BookingService {
  constructor(private readonly bookingClient: BookingClient) {}

  async createAndVerify(request: BookingRequest): Promise<BookingResponse> {
    const createResponse = await this.bookingClient.createBooking(request);
    expect(createResponse.status()).toBe(200);

    const created: BookingResponse = await createResponse.json();
    expect(created.bookingid).toBeTruthy();

    const getResponse = await this.bookingClient.getBookingById(created.bookingid);
    expect(getResponse.status()).toBe(200);

    const fetched: BookingRequest = await getResponse.json();
    expect(fetched.firstname).toBe(request.firstname);
    expect(fetched.lastname).toBe(request.lastname);
    expect(fetched.totalprice).toBe(request.totalprice);

    return created;
  }

  async updateAndVerify(id: number, updatedRequest: BookingRequest, token: string): Promise<void> {
    const updateResponse = await this.bookingClient.updateBooking(id, updatedRequest, token);
    expect(updateResponse.status()).toBe(200);

    const getResponse = await this.bookingClient.getBookingById(id);
    expect(getResponse.status()).toBe(200);

    const fetched: BookingRequest = await getResponse.json();
    expect(fetched.firstname).toBe(updatedRequest.firstname);
    expect(fetched.totalprice).toBe(updatedRequest.totalprice);
  }

  async deleteAndVerify(id: number, token: string): Promise<void> {
    const deleteResponse = await this.bookingClient.deleteBooking(id, token);
    // Restful Booker returns 201 on successful delete (quirk)
    expect(deleteResponse.status()).toBe(201);

    const getResponse = await this.bookingClient.getBookingById(id);
    expect(getResponse.status()).toBe(404);
  }
}
