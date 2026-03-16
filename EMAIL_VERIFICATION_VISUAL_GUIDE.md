# Email Verification Feature - Visual Guide

## Modal Layout

```
┌─────────────────────────────────────────────────────┐
│  Invite Team Member                              [X] │
├─────────────────────────────────────────────────────┤
│                                                       │
│  Name *                                              │
│  [Enter member name________________]                 │
│                                                       │
│  Email * ✓ Verified                                  │
│  ┌──────────────────────────────┐ ┌──────────────┐  │
│  │ Enter member email...         │ │ ✓ Verified   │  │
│  └──────────────────────────────┘ └──────────────┘  │
│  Found: John Doe                                     │
│                                                       │
│  Role *                                              │
│  [Developer                        ▼]                │
│                                                       │
│                    [Cancel]  [Invite Member]         │
└─────────────────────────────────────────────────────┘
```

## Button States

### 1. Default State (Empty Email)
```
┌──────────────┐
│   Verify     │  ← Disabled (gray), can't click
└──────────────┘
```

### 2. Ready to Verify
```
┌──────────────┐
│   Verify     │  ← Enabled (blue), clickable
└──────────────┘
```

### 3. Verifying (Loading)
```
┌──────────────┐
│ 🔄 Verifying │  ← Spinning icon, disabled
└──────────────┘
```

### 4. Email Verified
```
┌──────────────┐
│ ✓ Verified   │  ← Green button with checkmark
└──────────────┘
Label above: "Email * ✓ Verified"
Message: "Found: John Doe"
```

### 5. Email Not Found
```
┌──────────────┐
│ ✗ Not Found  │  ← Red button, user must correct email
└──────────────┘
Alert: "Email not found in database. Please check the email address."
```

### 6. Error State
```
┌──────────────┐
│ ✗ Error      │  ← Red button, user can retry
└──────────────┘
Alert: "Error verifying email. Please try again."
```

## Complete Flow Diagram

```
                    ┌─────────────────┐
                    │ Invite Button   │
                    │ Clicked         │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Modal Opens     │
                    │ Form Displayed  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────┐          ┌─────────┐         ┌─────────┐
   │ Name    │          │ Email   │         │ Role    │
   │ field   │          │ field   │         │ field   │
   └─────────┘          └────┬────┘         └─────────┘
                             │
                             │ Enter email
                             │
                             ▼
                    ┌─────────────────┐
                    │ Click Verify    │
                    │ Button          │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Button shows    │
                    │ "Verifying..."  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ FOUND    │  │ NOT FOUND│  │  ERROR   │
        │ ✓ Green  │  │ ✗ Red    │  │ ✗ Red    │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │             │             │
             │             │             │
             ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Alert:   │  │ Alert:   │  │ Alert:   │
        │ Verified │  │ Not Found│  │ Error    │
        │ User OK  │  │ Fix Email│  │ Try Again│
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │             │             │
             ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Can Send │  │ Must Fix │  │ Can Retry│
        │ Invite   │  │ Email    │  │ Verify   │
        │ Form     │  │ & Reverify   │         │
        └──────────┘  └──────────┘  └──────────┘
```

## Form Validation Rules

```
Step 1: Fill Form
├─ Name: (optional, will auto-fill if found)
├─ Email: REQUIRED
├─ Role: REQUIRED
└─ All fields visible

Step 2: Click Verify
├─ Check if email is not empty
├─ Send to backend: GET /api/users/verify-email?email=...
├─ Show loading spinner
└─ Wait for response

Step 3: Handle Response
├─ IF (200 OK):
│  ├─ Show ✓ Verified badge
│  ├─ Display user details
│  └─ Enable Invite button
├─ IF (404 Not Found):
│  ├─ Show ✗ Not Found badge
│  ├─ Alert user to check email
│  └─ Disable Invite button
└─ IF (Error):
   ├─ Show ✗ Error badge
   ├─ Alert user to try again
   └─ Disable Invite button

Step 4: Submit Form
├─ Check if emailVerificationStatus === 'verified'
├─ IF verified:
│  ├─ Create member in database
│  ├─ Send invitation email
│  ├─ Show success message
│  ├─ Close modal
│  └─ Refresh member list
└─ IF NOT verified:
   ├─ Show alert: "Please verify first"
   └─ Keep modal open
```

## Dark Mode Colors

### Light Mode (Default)
```
Verify Button:
  Default: Light gray background, dark text
  Verified: Light green background (#ecfdf5)
  Not Found: Light red background (#fef2f2)
  Error: Light red background (#fef2f2)
  Verifying: Light blue background (#eff6ff)

Status Badge:
  Verified: Green text (#059669)
  Not Found: Red text (#dc2626)
  Error: Red text (#dc2626)
```

### Dark Mode
```
Verify Button:
  Default: Dark gray background, light text
  Verified: Dark green background with light green border
  Not Found: Dark red background with light red border
  Error: Dark red background with light red border
  Verifying: Dark blue background with light blue border

Status Badge:
  Verified: Light green text (#6ee7b7)
  Not Found: Light red text (#f87171)
  Error: Light red text (#f87171)
```

## User Feedback Messages

### Success Messages
```
"Email verified! User: John Doe"
"Member invited successfully and email sent"
```

### Error Messages
```
"Please enter an email address"
"Email not found in database. Please check the email address."
"Error verifying email. Please try again."
"Failed to verify email: [error details]"
"Please verify the email address first by clicking the Verify button"
```

## Response Examples

### Successful Verification (200 OK)
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "avatar": "https://randomuser.me/api/portraits/men/32.jpg",
  "role": "Developer",
  "timezone": "UTC+5:30"
}
```

### Not Found (404)
```
Empty response or 404 status code
```

### Error (500)
```json
{
  "error": "Database connection failed"
}
```

## Testing Examples

### Test Case 1: Valid Email
```
1. Click "Invite Team Member"
2. Enter:
   - Email: john.doe@example.com
   - Role: Developer
3. Click "Verify"
4. Expected: ✓ Verified, "Found: John Doe", name auto-filled
5. Click "Invite Member"
6. Expected: Member added, email sent, modal closes
```

### Test Case 2: Invalid Email
```
1. Click "Invite Team Member"
2. Enter:
   - Email: nonexistent@example.com
   - Role: Developer
3. Click "Verify"
4. Expected: ✗ Not Found, alert shown
5. User corrects email and clicks "Verify" again
6. Expected: ✓ Verified
7. Click "Invite Member"
8. Expected: Member added, email sent, modal closes
```

### Test Case 3: Network Error
```
1. Click "Invite Team Member"
2. Enter:
   - Email: test@example.com
   - Role: Developer
3. Backend is down - Click "Verify"
4. Expected: ✗ Error, alert with error message
5. User clicks "Verify" again after backend recovers
6. Expected: ✓ Verified
```

### Test Case 4: Form Submission Without Verification
```
1. Click "Invite Team Member"
2. Enter:
   - Name: John Doe
   - Email: john@example.com
   - Role: Developer
3. Click "Invite Member" WITHOUT clicking "Verify"
4. Expected: Alert "Please verify the email address first by clicking the Verify button"
5. Modal stays open
6. User clicks "Verify"
7. Button shows ✓ Verified
8. User clicks "Invite Member"
9. Expected: Member added successfully
```
