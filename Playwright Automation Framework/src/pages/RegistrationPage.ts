import { Page, Locator } from '@playwright/test';

// Target: http://localhost:7000/registration-demo.html
// All locators VERIFIED from DOM (registration-demo.html read 2026-06-12)
export class RegistrationPage {
  readonly page: Page;

  // Form inputs — verified IDs from DOM
  readonly firstNameInput:       Locator; // #firstName
  readonly lastNameInput:        Locator; // #lastName
  readonly emailInput:           Locator; // #email
  readonly phoneInput:           Locator; // #phone, maxlength=10
  readonly dobInput:             Locator; // #dob, type=date
  readonly passwordInput:        Locator; // #password
  readonly confirmPasswordInput: Locator; // #confirmPassword
  readonly termsCheckbox:        Locator; // #terms
  readonly submitButton:         Locator; // #submitBtn, text="Create Account"

  // Error messages — verified IDs from DOM
  readonly firstNameError:       Locator; // #firstNameError
  readonly lastNameError:        Locator; // #lastNameError
  readonly emailError:           Locator; // #emailError
  readonly phoneError:           Locator; // #phoneError
  readonly dobError:             Locator; // #dobError
  readonly passwordError:        Locator; // #passwordError
  readonly confirmPasswordError: Locator; // #confirmPasswordError
  readonly termsError:           Locator; // #termsError

  // Toast — verified ID from DOM: #toast, gains .show class when visible
  readonly toast: Locator;

  // Password strength indicators — verified IDs from DOM
  readonly reqLength:  Locator; // #req-length  — gains .met class when satisfied
  readonly reqUpper:   Locator; // #req-upper
  readonly reqLower:   Locator; // #req-lower
  readonly reqDigit:   Locator; // #req-digit
  readonly reqSpecial: Locator; // #req-special

  constructor(page: Page) {
    this.page = page;

    this.firstNameInput       = page.locator('#firstName');
    this.lastNameInput        = page.locator('#lastName');
    this.emailInput           = page.locator('#email');
    this.phoneInput           = page.locator('#phone');
    this.dobInput             = page.locator('#dob');
    this.passwordInput        = page.locator('#password');
    this.confirmPasswordInput = page.locator('#confirmPassword');
    this.termsCheckbox        = page.locator('#terms');
    this.submitButton         = page.locator('#submitBtn');

    this.firstNameError       = page.locator('#firstNameError');
    this.lastNameError        = page.locator('#lastNameError');
    this.emailError           = page.locator('#emailError');
    this.phoneError           = page.locator('#phoneError');
    this.dobError             = page.locator('#dobError');
    this.passwordError        = page.locator('#passwordError');
    this.confirmPasswordError = page.locator('#confirmPasswordError');
    this.termsError           = page.locator('#termsError');

    this.toast      = page.locator('#toast');
    this.reqLength  = page.locator('#req-length');
    this.reqUpper   = page.locator('#req-upper');
    this.reqLower   = page.locator('#req-lower');
    this.reqDigit   = page.locator('#req-digit');
    this.reqSpecial = page.locator('#req-special');
  }

  async goto(): Promise<void> {
    await this.page.goto('http://localhost:7000/registration-demo.html');
  }

  // Fill all fields with valid data for happy-path tests
  async fillValidForm(): Promise<void> {
    await this.firstNameInput.fill('Rahul');
    await this.lastNameInput.fill('Sharma');
    await this.emailInput.fill('rahul@example.com');
    // pressSequentially — AH-18: respects maxlength=10 browser constraint
    await this.phoneInput.pressSequentially('9876543210');
    await this.dobInput.fill('2000-01-01');
    await this.passwordInput.fill('Password1!');
    await this.confirmPasswordInput.fill('Password1!');
    await this.termsCheckbox.check();
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }
}
