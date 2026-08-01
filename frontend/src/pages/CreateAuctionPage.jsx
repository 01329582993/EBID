import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAuction } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const CATEGORIES = ['Electronics', 'Fashion', 'Art', 'Collectibles', 'Vehicles', 'Jewelry', 'Sports', 'General'];

export default function CreateAuctionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    startingPrice: '',
    category: 'General',
    endTime: '',
    imageUrl: '',
  });

  if (!user || user.role !== 'SELLER') {
    return (
      <div className="main-content">
        <div className="empty-state">
          <div className="empty-state-icon">🚫</div>
          <div className="empty-state-title">Sellers Only</div>
          <p>Only accounts with the Seller role can create auctions.</p>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.endTime) { toast.error('Please set an end time'); return; }
    const end = new Date(form.endTime);
    if (end <= new Date()) { toast.error('End time must be in the future'); return; }

    setLoading(true);
    try {
      const payload = {
        ...form,
        sellerId: user.userId,
        startingPrice: parseFloat(form.startingPrice),
        endTime: end.toISOString().slice(0, 19), // LocalDateTime format
      };
      const res = await createAuction(payload);
      toast.success('Auction created successfully! 🎉');
      navigate(`/auction/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create auction');
    } finally {
      setLoading(false);
    }
  };

  // Minimum datetime: now + 1 minute
  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <div className="main-content" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h1 className="page-title">Create New Auction</h1>
        <p className="page-subtitle">List your item for live competitive bidding</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="form-group">
            <label className="form-label">Item Title *</label>
            <input
              id="auction-title"
              name="title"
              type="text"
              className="form-input"
              placeholder="e.g. Vintage Rolex Submariner 1960"
              value={form.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              id="auction-description"
              name="description"
              className="form-input"
              placeholder="Describe your item in detail — condition, history, dimensions..."
              value={form.description}
              onChange={handleChange}
              rows={4}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Starting Price ($) *</label>
              <input
                id="auction-starting-price"
                name="startingPrice"
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                placeholder="0.00"
                value={form.startingPrice}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                id="auction-category"
                name="category"
                className="form-input"
                value={form.category}
                onChange={handleChange}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Auction End Time *</label>
            <input
              id="auction-end-time"
              name="endTime"
              type="datetime-local"
              className="form-input"
              min={minDateTime}
              value={form.endTime}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Image URL (optional)</label>
            <input
              id="auction-image-url"
              name="imageUrl"
              type="url"
              className="form-input"
              placeholder="https://example.com/image.jpg"
              value={form.imageUrl}
              onChange={handleChange}
            />
          </div>

          {form.imageUrl && (
            <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', maxHeight: 200 }}>
              <img src={form.imageUrl} alt="Preview" style={{ width: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/')}>Cancel</button>
            <button
              id="create-auction-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : '🚀 Launch Auction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
