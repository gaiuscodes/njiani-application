import axios from 'axios';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

axiosCookieJarSupport(axios);

const jar = new CookieJar();
const client = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true,
  jar
});

const testLogin = async (phone, password, role) => {
  try {
    console.log(`\n🔐 Testing ${role} login: ${phone}`);
    
    // Test login
    const loginRes = await client.post('/api/auth/login', {
      phone,
      password,
      role
    });
    
    console.log('✅ Login successful:', loginRes.data.message);
    console.log('   User:', loginRes.data.user);
    
    // Test /me endpoint
    const meRes = await client.get('/api/auth/me');
    console.log('✅ /api/auth/me works:', meRes.data.user.name || meRes.data.user.shopName);
    
    // Test role-specific endpoint
    if (role === 'rider') {
      const profileRes = await client.get('/api/rider/profile');
      console.log('✅ Rider profile loaded:', profileRes.data.rider.name);
    } else if (role === 'shop') {
      const profileRes = await client.get('/api/shop/profile');
      console.log('✅ Shop profile loaded:', profileRes.data.shop.shopName);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ ${role} login failed:`, error.response?.data?.message || error.message);
    return false;
  }
};

const runTests = async () => {
  console.log('🧪 Testing Authentication Flow\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Test shop login
  await testLogin('0700111222', 'umai123', 'shop');
  
  // Test rider login (Godie)
  await testLogin('0712345678', 'godie123', 'rider');
  
  // Test rider login (Bob)
  await testLogin('0723456789', 'bob123', 'rider');
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Authentication tests completed!\n');
};

runTests().catch(console.error);

