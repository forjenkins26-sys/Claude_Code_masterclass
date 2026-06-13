import { faker } from '@faker-js/faker';
import { config } from '../01_config/config';
import { AuthRequest } from '../02_types/auth.types';
import { BookingRequest } from '../02_types/booking.types';
import { futureDate } from './date-utils';

export function buildBookingRequest(): BookingRequest {
  return {
    firstname: faker.person.firstName(),
    lastname: faker.person.lastName(),
    totalprice: faker.number.int({ min: 50, max: 500 }),
    depositpaid: true,
    bookingdates: {
      checkin: futureDate(5),
      checkout: futureDate(10)
    },
    additionalneeds: 'Breakfast'
  };
}

export function buildAuthRequest(): AuthRequest {
  return {
    username: config.auth.username,
    password: config.auth.password
  };
}
