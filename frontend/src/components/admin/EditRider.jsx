import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const EditRider = ({ rider, onClose, onUpdate }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    nationalId: '',
    vehicleType: 'Motorcycle',
    status: 'pending',
    preferredAreas: ''
  });
  const [selfiePhoto, setSelfiePhoto] = useState(null);
  const [idPhoto, setIdPhoto] = useState(null);
  const [licensePhoto, setLicensePhoto] = useState(null);
  const [photoPreviews, setPhotoPreviews] = useState({
    selfie: '',
    id: '',
    license: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (rider) {
      setFormData({
        name: rider.name || '',
        phone: rider.phone || '',
        email: rider.email || '',
        nationalId: rider.nationalId || '',
        vehicleType: rider.vehicleType || 'Motorcycle',
        status: rider.status || 'pending',
        preferredAreas: rider.preferredAreas?.join(', ') || ''
      });
      setPhotoPreviews({
        selfie: rider.selfiePhoto || '',
        id: rider.idPhoto || '',
        license: rider.licensePhoto || ''
      });
    }
  }, [rider]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleFileChange = (type, e) => {
    const file = e.target.files[0];
    if (file) {
      if (type === 'selfie') setSelfiePhoto(file);
      if (type === 'id') setIdPhoto(file);
      if (type === 'license') setLicensePhoto(file);
      
      setPhotoPreviews(prev => ({
        ...prev,
        [type]: URL.createObjectURL(file)
      }));
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'preferredAreas') {
          data.append(key, formData[key]);
        } else {
          data.append(key, formData[key]);
        }
      });
      if (selfiePhoto) data.append('selfiePhoto', selfiePhoto);
      if (idPhoto) data.append('idPhoto', idPhoto);
      if (licensePhoto) data.append('licensePhoto', licensePhoto);

      const response = await axios.put(`/api/admin/riders/${rider._id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess('Rider updated successfully!');
      onUpdate(response.data.rider);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error updating rider:', err);
      setError(err.response?.data?.message || 'Failed to update rider. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await axios.post(`/api/admin/riders/${rider._id}/reset-password`, {
        newPassword
      });
      setSuccess('Password reset successfully!');
      setNewPassword('');
      setShowPasswordReset(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!rider) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-dark-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Edit Rider: {rider.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-2">Name *</label>
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
              <label className="block text-gray-300 mb-2">Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                pattern="^0\d{9}$"
                required
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-2">National ID *</label>
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
              <label className="block text-gray-300 mb-2">Vehicle Type *</label>
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                required
                className="input-field"
              >
                <option value="Motorcycle">Motorcycle</option>
                <option value="Bicycle">Bicycle</option>
                <option value="Foot">Foot</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input-field"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Preferred Areas</label>
              <input
                type="text"
                name="preferredAreas"
                value={formData.preferredAreas}
                onChange={handleChange}
                placeholder="Comma-separated areas"
                className="input-field"
              />
            </div>
          </div>

          {/* Photo Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-300 mb-2">Selfie Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange('selfie', e)}
                className="input-field"
              />
              {photoPreviews.selfie && (
                <img src={photoPreviews.selfie} alt="Selfie" className="mt-2 w-20 h-20 object-cover rounded" />
              )}
            </div>
            <div>
              <label className="block text-gray-300 mb-2">ID Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange('id', e)}
                className="input-field"
              />
              {photoPreviews.id && (
                <img src={photoPreviews.id} alt="ID" className="mt-2 w-20 h-20 object-cover rounded" />
              )}
            </div>
            <div>
              <label className="block text-gray-300 mb-2">License Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange('license', e)}
                className="input-field"
              />
              {photoPreviews.license && (
                <img src={photoPreviews.license} alt="License" className="mt-2 w-20 h-20 object-cover rounded" />
              )}
            </div>
          </div>

          {/* Password Reset Section */}
          <div className="border-t border-dark-700 pt-4">
            <button
              type="button"
              onClick={() => setShowPasswordReset(!showPasswordReset)}
              className="text-primary-500 hover:text-primary-400 text-sm"
            >
              {showPasswordReset ? 'Cancel Password Reset' : 'Reset Rider Password'}
            </button>
            {showPasswordReset && (
              <div className="mt-3 space-y-2">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 6 characters)"
                  minLength={6}
                  className="input-field"
                />
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="btn-secondary text-sm"
                >
                  Reset Password
                </button>
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">{success}</p>}

          <div className="flex gap-4 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRider;

