# Audit Logging

Every failed login attempt is written to the audit log.
Each audit entry records the timestamp and the source IP address.
Audit entries are retained for 90 days.
Only users with the auditor role can read the audit log.
