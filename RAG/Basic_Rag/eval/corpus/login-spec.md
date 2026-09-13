# QuickCart Login — Specification

This file is the evaluation corpus. It is deliberately small and
self-contained so that every expected answer is knowable, and so that any
question NOT answered here is provably out of corpus.

Do not edit it casually — the refusal tests depend on what is absent from
this file just as much as on what is present.

## Mobile number field

AC-1: The mobile number field accepts exactly 10 digits.

AC-2: Submitting fewer than 10 digits shows the error message
"Enter valid 10-digit mobile number".

AC-3: The mobile number field rejects non-numeric characters. Letters typed
into the field do not appear in it.

## Submission

AC-4: Submitting a valid 10-digit mobile number shows a toast containing
"OTP sent".

AC-5: The account locks after five consecutive failed login attempts, showing
"Too many attempts, try again in 15 minutes".

## Navigation

AC-6: The "Create New Account" button navigates the user away from the login
page.

## Password

AC-7: The password field masks its input. The typed value is never visible as
plain text.

AC-8: A password must be at least 8 characters long.

## Out of scope

Performance, accessibility, internationalisation, audit logging and
server-side authorization are explicitly out of scope for this specification.
