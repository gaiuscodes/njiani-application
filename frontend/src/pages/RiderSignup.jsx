import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import PhotoCapture from '../components/PhotoCapture';

const RiderSignup = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showAffidavit, setShowAffidavit] = useState(false);
  const [affidavitRead, setAffidavitRead] = useState(false);
  const affidavitContentRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: '',
    email: '',
    password: '',
    nationalId: '',
    vehicleType: 'Motorcycle',
    preferredAreas: 'CBD/Parklands',
    termsAccepted: false,
    affidavitAccepted: false
  });
  const [files, setFiles] = useState({
    selfiePhoto: null,
    idPhoto: null,
    licensePhoto: null
  });

  // Affidavit text
  const affidavitText = `AFFIDAVIT OF RESPONSIBILITY FOR DELIVERY GOODS

I, the undersigned rider, hereby acknowledge and agree to the following terms and conditions regarding my responsibilities as a delivery rider on the Njiani platform:

1. FULL RESPONSIBILITY FOR GOODS
   I understand and accept that once I collect goods from a shop or merchant, I assume full and complete responsibility for the safe delivery of those goods to the designated recipient. This responsibility includes, but is not limited to:
   - Ensuring the goods are properly secured during transport
   - Maintaining the integrity and condition of the goods
   - Delivering the goods to the correct recipient at the specified address
   - Verifying the identity of the recipient when required

2. LOSS, DAMAGE, OR THEFT
   I acknowledge that I will be held financially liable for:
   - Any loss of goods while in my possession
   - Any damage to goods caused during transport (unless due to inherent defects or improper packaging by the merchant)
   - Any theft of goods while in my custody
   - Any failure to deliver goods to the correct recipient

3. COMPENSATION AND REIMBURSEMENT
   In the event of loss, damage, or theft of goods:
   - I agree to compensate the shop/merchant for the full value of the goods
   - I understand that compensation may be deducted from my earnings or wallet balance
   - I agree to reimburse Njiani for any amounts paid to merchants on my behalf
   - I acknowledge that failure to compensate may result in suspension or termination of my account

4. INSURANCE AND PROTECTION
   I understand that:
   - I am responsible for obtaining my own insurance coverage if desired
   - Njiani does not provide insurance coverage for goods in my possession
   - I am solely responsible for any claims arising from loss, damage, or theft

5. PROPER HANDLING
   I agree to:
   - Handle all goods with reasonable care and diligence
   - Follow any special handling instructions provided by the merchant
   - Use appropriate packaging or securing methods to prevent damage
   - Report any issues or concerns immediately to Njiani support

6. VERIFICATION AND DOCUMENTATION
   I agree to:
   - Verify the identity of recipients when required
   - Obtain signatures or confirmations of delivery when requested
   - Take photographs as proof of delivery when necessary
   - Maintain accurate records of all deliveries

7. COMPLIANCE WITH LAWS
   I acknowledge that:
   - I must comply with all applicable traffic and delivery laws
   - I am responsible for any violations or fines incurred during delivery
   - I must have valid licenses and permits required for my vehicle type

8. ACKNOWLEDGMENT
   By accepting this affidavit, I confirm that:
   - I have read and understood all terms and conditions
   - I voluntarily accept full responsibility for goods once collected
   - I understand the financial and legal implications of this agreement
   - I agree to be bound by these terms throughout my use of the Njiani platform

I understand that this affidavit is a legally binding agreement and that my acceptance constitutes a commitment to fulfill all responsibilities outlined herein.

Date: ${new Date().toLocaleDateString()}
Platform: Njiani - Mizigo njiani`;

  // Check if user has scrolled to bottom of affidavit
  const handleAffidavitScroll = () => {
    const element = affidavitContentRef.current;
    if (element) {
      const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 10;
      if (isAtBottom && !affidavitRead) {
        setAffidavitRead(true);
      }
    }
  };

  // If user unchecks affidavit, they need to read it again
  useEffect(() => {
    if (!formData.affidavitAccepted && affidavitRead) {
      // User unchecked after reading - they need to read again
      setAffidavitRead(false);
    }
  }, [formData.affidavitAccepted]);

  const handleChange = (e) => {
    if (e.target.type === 'checkbox') {
      setFormData({ ...formData, [e.target.name]: e.target.checked });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || e.target.value;
    setFiles({ ...files, [e.target.name]: file });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that affidavit has been read
    if (formData.affidavitAccepted && !affidavitRead) {
      alert('Please read the full affidavit before accepting. Click "Read Affidavit" and scroll to the bottom.');
      return;
    }
    
    setLoading(true);

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key !== 'termsAccepted' && key !== 'affidavitAccepted') {
          if (key === 'username') {
            data.append(key, formData[key].trim().toLowerCase());
          } else {
            data.append(key, formData[key]);
          }
        } else {
          data.append(key, formData[key] ? 'true' : 'false');
        }
      });

      if (files.selfiePhoto) data.append('selfiePhoto', files.selfiePhoto);
      if (files.idPhoto) data.append('idPhoto', files.idPhoto);
      if (files.licensePhoto) data.append('licensePhoto', files.licensePhoto);

      const response = await axios.post('/api/auth/register/rider', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Check if email verification is required
      if (response.data.requiresVerification) {
        setLoading(false);
        
        // Show appropriate message based on email status
        if (!response.data.emailSent) {
          const message = response.data.emailError 
            ? `Registration successful! However, the verification email could not be sent: ${response.data.emailError}. Please use the resend verification feature.`
            : 'Registration successful! Email verification is not configured. Please contact admin or use the resend verification feature.';
          alert(message);
        }
        
        // Navigate to verification page
        navigate(`/verify-email?email=${encodeURIComponent(response.data.email)}`);
        return;
      }

      // Set user in context and navigate to dashboard
      login(response.data.user);
      navigate('/rider/dashboard');
    } catch (error) {
      alert(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-primary-500">Njiani</Link>
          <h2 className="text-2xl font-bold text-white mt-4">Rider Registration</h2>
          <Link to="/" className="text-sm text-gray-400 hover:text-primary-500 mt-2 inline-block">
            ← Back to Home
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          <div>
            <label className="block text-gray-300 mb-2">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Username *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="johndoe"
              pattern="^[a-z0-9_]{3,30}$"
              required
              className="input-field"
            />
            <p className="text-xs text-gray-400 mt-1">
              3-30 characters, lowercase letters, numbers, and underscores only
            </p>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0700412580"
              pattern="^0\d{9}$"
              required
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="rider@example.com"
              required
              className="input-field"
            />
            <p className="text-xs text-gray-400 mt-1">
              A verification email will be sent to this address
            </p>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              minLength={6}
              required
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">National ID Number</label>
            <input
              type="text"
              name="nationalId"
              value={formData.nationalId}
              onChange={handleChange}
              required
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Vehicle Type</label>
            <select
              name="vehicleType"
              value={formData.vehicleType}
              onChange={handleChange}
              className="input-field"
            >
              <option value="Motorcycle">Motorcycle</option>
              <option value="Bicycle">Bicycle</option>
              <option value="Foot">Foot</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Preferred Areas (comma-separated)</label>
            <input
              type="text"
              name="preferredAreas"
              value={formData.preferredAreas}
              onChange={handleChange}
              placeholder="CBD/Parklands"
              className="input-field"
            />
          </div>

          <PhotoCapture
            label="Selfie Photo"
            name="selfiePhoto"
            value={files.selfiePhoto}
            onChange={handleFileChange}
            required={false}
          />

          <PhotoCapture
            label="National ID Photo (Front)"
            name="idPhoto"
            value={files.idPhoto}
            onChange={handleFileChange}
            required={false}
          />

          <PhotoCapture
            label="Driver's License OR Bodaboda Logbook Photo"
            name="licensePhoto"
            value={files.licensePhoto}
            onChange={handleFileChange}
            required={false}
          />

          <div className="space-y-3">
            <label className="flex items-start">
              <input
                type="checkbox"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleChange}
                required
                className="mt-1 mr-3"
              />
              <span className="text-gray-300 text-sm">
                I accept the Terms & Conditions
              </span>
            </label>
            <div className="border border-dark-700 rounded-lg p-4 bg-dark-800">
              <div className="flex items-start justify-between mb-3">
                <label className="flex items-start flex-1">
                  <input
                    type="checkbox"
                    name="affidavitAccepted"
                    checked={formData.affidavitAccepted}
                    onChange={(e) => {
                      if (!affidavitRead && e.target.checked) {
                        alert('Please read the full affidavit first by clicking "Read Affidavit" and scrolling to the bottom.');
                        return;
                      }
                      handleChange(e);
                    }}
                    required
                    className="mt-1 mr-3"
                  />
                  <span className="text-gray-300 text-sm flex-1">
                    I take full responsibility for goods once collected (Affidavit)
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAffidavit(true)}
                  className="btn-secondary text-sm px-4 py-2 ml-3 whitespace-nowrap"
                >
                  {affidavitRead ? '✓ Read' : 'Read Affidavit'}
                </button>
              </div>
              {!affidavitRead && (
                <p className="text-xs text-yellow-400 mt-2">
                  ⚠️ You must read the full affidavit before accepting. Click "Read Affidavit" to view the complete document.
                </p>
              )}
              {affidavitRead && !formData.affidavitAccepted && (
                <p className="text-xs text-green-400 mt-2">
                  ✓ You have read the affidavit. Please check the box above to accept.
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3"
          >
            {loading ? 'Registering...' : 'Register as Rider'}
          </button>

          <p className="text-center text-gray-400">
            Already have an account?{' '}
            <Link to="/rider/login" className="text-primary-500 hover:underline">
              Login
            </Link>
          </p>
        </form>

        {/* Affidavit Modal */}
        {showAffidavit && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-dark-800 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-dark-700 shadow-2xl animate-slideUp">
              {/* Modal Header */}
              <div className="p-6 border-b border-dark-700 flex justify-between items-center">
                <h3 className="text-2xl font-bold text-white">Affidavit of Responsibility</h3>
                <button
                  onClick={() => setShowAffidavit(false)}
                  className="text-gray-400 hover:text-white text-3xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div
                ref={affidavitContentRef}
                onScroll={handleAffidavitScroll}
                className="flex-1 overflow-y-auto p-6"
                style={{ maxHeight: 'calc(90vh - 180px)' }}
              >
                <div className="prose prose-invert max-w-none">
                  <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                    {affidavitText}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-dark-700 bg-dark-900">
                {!affidavitRead && (
                  <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                    <p className="text-yellow-400 text-sm flex items-center">
                      <span className="mr-2">📜</span>
                      Please scroll to the bottom of the affidavit to continue.
                    </p>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setShowAffidavit(false)}
                    className="btn-secondary"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (affidavitRead) {
                        setFormData({ ...formData, affidavitAccepted: true });
                        setShowAffidavit(false);
                      }
                    }}
                    disabled={!affidavitRead}
                    className={`btn-primary ${!affidavitRead ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {affidavitRead ? 'Accept Affidavit' : 'Scroll to Bottom First'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderSignup;

