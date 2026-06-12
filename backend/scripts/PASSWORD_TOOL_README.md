# Password Verification Tool

## Overview

This tool verifies if a password matches a user's stored password hash. **Passwords cannot be decrypted** - they are hashed using bcrypt for security. This tool can only verify if a given password matches the stored hash.

## Usage

### Basic Usage

```bash
node scripts/verify-password.js <identifier> <password> [role]
```

Or using npm script:

```bash
npm run verify-password <identifier> <password> [role]
```

### Parameters

- **identifier** (required): Can be:
  - Username (primary identifier)
  - Phone number (e.g., `0700412580`)
  - Email address (e.g., `user@example.com`)

- **password** (required): The password to verify

- **role** (optional): Filter by user role:
  - `admin`
  - `rider`
  - `shop`

## Examples

### Verify Admin Password
```bash
node scripts/verify-password.js admin King2025 admin
```

### Verify Rider Password by Phone
```bash
node scripts/verify-password.js 0700412580 akanda123 rider
```

### Verify Shop Password by Email
```bash
node scripts/verify-password.js davidzebedi@gmail.com mypassword shop
```

### Verify Without Role Filter
```bash
node scripts/verify-password.js 0700412580 akanda123
```

## Output

The tool will display:
- ✅ **SUCCESS**: Password matches - user can login
- ❌ **FAILED**: Password does not match - user cannot login
- User information (ID, role, name, phone, email, status)
- Password hash type verification

## Important Notes

1. **Passwords cannot be decrypted** - they are one-way hashed
2. This tool only **verifies** if a password matches
3. If you need to reset a password, use the "Forgot Password" feature
4. The tool requires MongoDB to be running and accessible

## Troubleshooting

### User Not Found
- Check the identifier spelling
- Try without role filter
- Use correct format:
  - Phone: `0700000000` (10 digits starting with 0)
  - Email: `user@example.com`
  - Username: lowercase, alphanumeric + underscore only

### Connection Errors
- Ensure MongoDB is running
- Check `MONGODB_URI` in `.env` file
- Default connection: `mongodb://localhost:27017/njiani`

## Security

- This tool should only be used by administrators
- Never share password verification results
- Use in secure environments only
- Consider logging usage for audit purposes





