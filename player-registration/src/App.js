import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:5001/api';

function App() {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Batsman',
    basePrice: '5'
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Photo size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Only image files are allowed');
        return;
      }
      setPhoto(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const submitData = new FormData();
      
      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          submitData.append(key, formData[key]);
        }
      });

      // Append photo
      if (photo) {
        submitData.append('photo', photo);
      }

      const response = await axios.post(`${API_URL}/players/register`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSubmitStatus({ type: 'success', message: response.data.message });
      
      // Reset form
      setFormData({
        name: '',
        category: 'Batsman',
        basePrice: '5'
      });
      setPhoto(null);
      setPhotoPreview(null);
      
      // Reset file input
      document.getElementById('photo-input').value = '';
    } catch (error) {
      setSubmitStatus({ 
        type: 'error', 
        message: error.response?.data?.message || 'Registration failed. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app">
      <div className="registration-container">
        <div className="registration-header">
          <h1>🏏 Cricket Auction</h1>
          <h2>Player Registration</h2>
          <p>Register yourself for the upcoming cricket auction</p>
        </div>

        <form onSubmit={handleSubmit} className="registration-form">
          {/* Photo Upload */}
          <div className="form-section photo-section">
            <label className="photo-upload-label">
              <input
                type="file"
                id="photo-input"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
              />
              <div className="photo-preview">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" />
                ) : (
                  <div className="photo-placeholder">
                    <span className="camera-icon">📷</span>
                    <span>Upload Photo</span>
                    <span className="photo-hint">Max 5MB</span>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Basic Information */}
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Virat Kohli"
                  required
                />
              </div>

              <div className="form-group">
                <label>Category *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Batsman">Batsman</option>
                  <option value="Bowler">Bowler</option>
                  <option value="All-Rounder">All-Rounder</option>
                  <option value="Wicket-Keeper">Wicket-Keeper</option>
                </select>
              </div>

              <div className="form-group">
                <label>Base Price (₹ Lakhs) *</label>
                <input
                  type="number"
                  name="basePrice"
                  value={formData.basePrice}
                  onChange={handleInputChange}
                  min="5"
                  max="100"
                  required
                />
              </div>
            </div>
          </div>

          {/* Submit Status */}
          {submitStatus && (
            <div className={`status-message ${submitStatus.type}`}>
              {submitStatus.type === 'success' ? '✅' : '❌'} {submitStatus.message}
            </div>
          )}

          {/* Submit Button */}
          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Register for Auction'}
          </button>

          <p className="disclaimer">
            * Required fields. Your registration will be reviewed by the admin before being approved for auction.
          </p>
        </form>
      </div>
    </div>
  );
}

export default App;
