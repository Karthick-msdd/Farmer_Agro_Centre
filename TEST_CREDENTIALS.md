# 🔑 Test Credentials - Farmer Agro Center

## ✅ WORKING - Ready to Use!

Both accounts have been tested and verified working!

## Login Credentials

### 👨‍🌾 Farmer Account
```
Email:    test@farmingagro.com
Password: Test@123
Role:     FARMER
```
✅ **Status**: Verified and working!

**Use this account to:**
- Browse and purchase products
- Manage your farm profile
- View market prices
- Access agricultural advisory
- Track orders

---

### 👑 Admin Account
```
Email:    admin@farmingagro.com
Password: Admin@123
Role:     ADMIN
```
✅ **Status**: Verified and working!

**Use this account to:**
- Manage all users
- Add/edit/delete products
- View all orders and analytics
- Manage system settings
- Access admin dashboard

---

## How to Login

1. **Open the application**: http://localhost:3000

2. **Navigate to Login page**

3. **Enter credentials** from above

4. **Click Login**

---

## API Testing (Optional)

You can also test the API directly:

### Login via API
```powershell
# Farmer Login
$body = @{
    email = "test@farmingagro.com"
    password = "Test@123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/mongo-auth/login" -Method POST -Body $body -ContentType "application/json"

# Admin Login
$body = @{
    email = "admin@farmingagro.com"
    password = "Admin@123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/mongo-auth/login" -Method POST -Body $body -ContentType "application/json"
```

---

## Creating More Users

### Via Web Interface
1. Go to http://localhost:3000
2. Click "Register" or "Sign Up"
3. Fill in the registration form
4. Choose role (Farmer/Vendor/etc.)

### Via API
```powershell
$newUser = @{
    name = "Your Name"
    email = "your@email.com"
    password = "YourPassword@123"
    phone = "+1234567890"
    role = "FARMER"
    farmSize = "10 acres"
    cropTypes = @("Corn", "Wheat")
    location = "Your Location"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/mongo-auth/register" -Method POST -Body $newUser -ContentType "application/json"
```

---

## Security Notes

⚠️ **Important:** These are TEST credentials for development only!

- Do NOT use these passwords in production
- Change default passwords before deploying
- Use strong, unique passwords for production accounts

---

## Troubleshooting

### Can't Login?
- Make sure both frontend (port 3000) and backend (port 5000) are running
- Check that you're using the correct email and password
- Clear your browser cache if needed

### Forgot Password?
- For test accounts, refer back to this document
- For production, implement password reset via email

---

**Created:** October 22, 2025  
**Environment:** Development  
**Status:** ✅ Active

**Access your application now at: http://localhost:3000**

