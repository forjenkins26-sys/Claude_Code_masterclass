import { test, expect } from '../src/fixtures/api-fixtures';
import { buildBookingRequest } from '../src/05_utils/data-factory';
import { futureDate } from '../src/05_utils/date-utils';
import { BookingId } from '../src/02_types/booking.types';

test.describe('Booking Filters', () => {

  test('verify filter by firstname returns matching bookings', async ({ bookingService, bookingClient }) => {
    const request = buildBookingRequest();
    request.firstname = 'FilterTestUser';
    await bookingService.createAndVerify(request);

    const response = await bookingClient.getBookingsByFilter({ firstname: 'FilterTestUser' });
    expect(response.status()).toBe(200);
    const body: BookingId[] = await response.json();
    expect(body.length).toBeGreaterThan(0);
  });

  test('verify filter by lastname returns matching bookings', async ({ bookingService, bookingClient }) => {
    const request = buildBookingRequest();
    request.lastname = 'AutomationSeed';
    await bookingService.createAndVerify(request);

    const response = await bookingClient.getBookingsByFilter({ lastname: 'AutomationSeed' });
    expect(response.status()).toBe(200);
    const body: BookingId[] = await response.json();
    expect(body.length).toBeGreaterThan(0);
  });

  test('verify filter by checkin date returns 200', async ({ bookingClient }) => {
    const response = await bookingClient.getBookingsByFilter({
      checkin: futureDate(1)
    });
    expect(response.status()).toBe(200);
  });

  test('verify filter by non-existent name returns empty list or 404', async ({ bookingClient }) => {
    const response = await bookingClient.getBookingsByFilter({
      firstname: 'ZZZNonExistentUser99999'
    });
    const status = response.status();
    if (status === 200) {
      const body: BookingId[] = await response.json();
      expect(body.length).toBe(0);
    } else {
      expect(status).toBe(404);
    }
  });

});
