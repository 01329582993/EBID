import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveAuctions } from '../api';
import AuctionTimer from '../components/AuctionTimer';
import toast from 'react-hot-toast';

export default function HomePage() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const res = await getActiveAuctions();
      setAuctions(res.data);
    } catch {
      toast.error('Could not load auctions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [load]);

  const categories = ['All', ...new Set(auctions.map(a => a.category || 'General'))];
  const filtered = filter === 'All' ? auctions : auctions.filter(a => (a.category || 'General') === filter);

  return (
    <div className="main-content">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Live Auctions</h1>
          <p className="page-subtitle">
            {auctions.length} active auction{auctions.length !== 1 ? 's' : ''} — updated live
          </p>
        </div>
        <div className="live-badge">
          <span className="live-dot" />
          LIVE
        </div>
      </div>

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-label">Active Auctions</div>
          <div className="stat-value purple">{auctions.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Bids</div>
          <div className="stat-value blue">—</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Highest Bid</div>
          <div className="stat-value gold">
            {auctions.length > 0
              ? '$' + Math.max(...auctions.map(a => parseFloat(a.currentBid || a.startingPrice || 0))).toFixed(2)
              : '—'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Categories</div>
          <div className="stat-value green">{categories.length - 1}</div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button
            key={cat}
            id={`filter-${cat}`}
            className={`tab-btn ${filter === cat ? 'active' : ''}`}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="spinner" />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No auctions found</div>
          <p>Check back later or try a different category</p>
        </div>
      ) : (
        <div className="auctions-grid">
          {filtered.map(auction => {
            const category = auction.category || 'General';
            return (
              <div
                key={auction.id}
                id={`auction-card-${auction.id}`}
                className="auction-card"
                onClick={() => navigate(`/auction/${auction.id}`)}
              >
                <div className="auction-card-img">
                  {auction.imageUrl
                    ? <img src={auction.imageUrl} alt={auction.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', color: 'var(--accent-gold)', opacity: 0.5 }}>
                        {category.charAt(0).toUpperCase()}
                      </span>
                    )
                  }
                </div>
                <div className="auction-card-body">
                  <div className="auction-card-category">{category}</div>
                  <div className="auction-card-title">{auction.title}</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                    {auction.description?.slice(0, 80)}{auction.description?.length > 80 ? '...' : ''}
                  </p>
                  <div className="auction-bid-row">
                    <div>
                      <div className="bid-label">Current Bid</div>
                      <div className="bid-amount">${parseFloat(auction.currentBid || auction.startingPrice).toFixed(2)}</div>
                    </div>
                    <AuctionTimer endTime={auction.endTime} status={auction.status} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
