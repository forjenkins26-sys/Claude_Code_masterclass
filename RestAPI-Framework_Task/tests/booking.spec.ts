import { test, expect } from '../src/fixtures/api-fixtures';
import { buildBookingRequest } from '../src/05_utils/data-factory';
import { BookingRequest } from '../src/02_types/booking.types';

test.describe('Booking CRUD', () => {

  test('verify GET all bookings returns non-empty list', async ({ bookingClient }) => {
    const response = await bookingClient.getAllBookings();
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
  });

  test('verify POST create booking returns created data', async ({ bookingService }) => {
    const request = buildBookingRequest();
    const created = await bookingService.createAndVerify(request);
    expect(created.bookingid).toBeGreaterThan(0);
  });

  test('verify GET booking by ID returns correct data', async ({ bookingService, bookingClient }) => {
    const request = buildBookingRequest();
    const created = await bookingService.createAndVerify(request);

    const response = await bookingClient.getBookingById(created.bookingid);
    expect(response.status()).toBe(200);
    const fetched: BookingRequest = await response.json();
    expect(fetched.firstname).toBe(request.firstname);
    expect(fetched.lastname).toBe(request.lastname);
  });

  test('verify PUT update booking reflects changes in GET', async ({ bookingService, authService }) => {
    const original = buildBookingRequest();
    const created = await bookingService.createAndVerify(original);
    const token = await authService.getToken();

    const updated = buildBookingRequest();
    await bookingService.updateAndVerify(created.bookingid, updated, token);
  });

  test('verify PATCH partial update changes only specified field', async ({ bookingService, bookingClient, authService }) => {
    const request = buildBookingRequest();
    const created = await bookingService.createAndVerify(request);
    const token = await authService.getToken();

    const getBeforePatch = await bookingClient.getBookingById(created.bookingid);
    const before: BookingRequest = await getBeforePatch.json();
    const originalLastname = before.lastname;

    const patchResponse = await bookingClient.partialUpdateBooking(
      created.bookingid,
      { firstname: 'PatchedName' },
      token
    );
    expect(patchResponse.status()).toBe(200);

    const getAfterPatch = await bookingClient.getBookingById(created.bookingid);
    const after: BookingRequest = await getAfterPatch.json();
    expect(after.firstname).toBe('PatchedName');
    expect(after.lastname).toBe(originalLastname);
  });

  test('verify DELETE without token returns 403', async ({ bookingService, bookingClient }) => {
    const request = buildBookingRequest();
    const created = await bookingService.createAndVerify(request);

    const response = await bookingClient.deleteBookingNoToken(created.bookingid);
    expect(response.status()).toBe(403);
  });

  test('verify DELETE with valid token returns 201 and GET returns 404', async ({ bookingService, authService }) => {
    const request = buildBookingRequest();
    const created = await bookingService.createAndVerify(request);
    const token = await authService.getToken();

    await bookingService.deleteAndVerify(created.bookingid, token);
  });

});
