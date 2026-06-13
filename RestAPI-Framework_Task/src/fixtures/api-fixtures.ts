import { test as base } from '@playwright/test';
import { AuthClient } from '../03_clients/auth.client';
import { BookingClient } from '../03_clients/booking.client';
import { AuthService } from '../04_services/auth.service';
import { BookingService } from '../04_services/booking.service';

type ApiFixtures = {
  authClient: AuthClient;
  bookingClient: BookingClient;
  authService: AuthService;
  bookingService: BookingService;
};

export const test = base.extend<ApiFixtures>({
  authClient: async ({ request }, use) => {
    await use(new AuthClient(request));
  },

  bookingClient: async ({ request }, use) => {
    await use(new BookingClient(request));
  },

  authService: async ({ request }, use) => {
    const client = new AuthClient(request);
    await use(new AuthService(client));
  },

  bookingService: async ({ request }, use) => {
    const client = new BookingClient(request);
    await use(new BookingService(client));
  }
});

export { expect } from '@playwright/test';
