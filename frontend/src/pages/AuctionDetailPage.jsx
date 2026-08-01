import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getAuction, getBidHistory, placeBid } from '../api';
import { useAuth } from '../context/AuthContext';
import AuctionTimer from '../components/AuctionTimer';
import toast from 'react-hot-toast';

export default function AuctionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [bidAmount, setBidAmount] = useState('');
  const [placing, setPlacing] = useState(false);
  const [flash, setFlash] = useState(false);
  const stompRef = useRef(null);

  useEffect(() => {
    loadAuction();
    loadBids();
    connectWebSocket();
    return () => stompRef.current?.deactivate();
  }, [id]);

  const loadAuction = async () => {
    try {
      const res = await getAuction(id);
      setAuction(res.data);
      setBidAmount((parseFloat(res.data.currentBid || res.data.startingPrice) + 1).toFixed(2));
    } catch {
      toast.error('Auction not found');
      navigate('/');
    }
  };

  const loadBids = async () => {
    try {
      const res = await getBidHistory(id);
      setBids(res.data);
    } catch { /* silent */ }
  };

  const connectWebSocket = () => {
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/auction/${id}`, (msg) => {
          const update = JSON.parse(msg.body);
          if (update.status === 'ENDED') {
            setAuction(prev => prev ? { ...prev, status: 'ENDED', currentBid: update.finalPrice } : prev);
            toast('🏁 Auction has ended!', { icon: '🔔' });
          } else {
            setAuction(prev => prev ? { ...prev, currentBid: update.currentBid } : prev);
            setBidAmount((parseFloat(update.currentBid) + 1).toFixed(2));
            setFlash(true);
            setTimeout(() => setFlash(false), 1000);
            loadBids();
            if (update.bidderId !== user?.userId) {
              toast('🔥 New bid placed!', { duration: 2000 });
            }
          }
        });
      },
    });
    client.activate();
    stompRef.current = client;
  };

  const handleBid = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/auth'); return; }
    if (user.role !== 'BIDDER') {
      toast.error('Only Bidders can place bids');
      return;
    }
    setPlacing(true);
    try {
      await placeBid(id, { bidderId: user.userId, amount: parseFloat(bidAmount) });
      toast.success(`Bid of $${bidAmount} placed! 🎉`);
      loadAuction();
      loadBids();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to place bid');
    } finally {
      setPlacing(false);
    }
  };

  if (!auction) return <div className="spinner" />;

  const currentBid = parseFloat(auction.currentBid || auction.startingPrice);
  const isActive = auction.status === 'ACTIVE';
  const canBid = user && user.role === 'BIDDER' && String(user.userId) !== String(auction.sellerId) && isActive;

  return (
    <div className="main-content">
      <button className="btn btn-outline btn-sm" onClick={() => navigate('/')} style={{ marginBottom: 24 }}>
        ← Back to Auctions
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
        {/* Left: Auction Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Image */}
          <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'linear-gradient(135deg,#1e1b4b,#312e81)', minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem' }}>
            {auction.imageUrl
              ? <img src={auction.imageUrl} alt={auction.title} style={{ width: '100%', objectFit: 'cover' }} />
              : '🏆'
            }
          </div>

          <div className="card">
            <div style={{ marginBottom: 8, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {auction.category || 'General'}
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 12 }}>{auction.title}</h1>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
              <span className={`status-badge status-${auction.status}`}>{auction.status}</span>
              <AuctionTimer endTime={auction.endTime} status={auction.status} />
              {isActive && <span className="live-badge"><span className="live-dot" />LIVE</span>}
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{auction.description}</p>
          </div>

          {/* Bid History */}
          <div className="card">
            <div className="section-title">Bid History</div>
            {bids.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>
                <div>No bids yet — be the first!</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {bids.map((bid, i) => (
                  <div key={bid.id} className={`bid-row ${i === 0 ? 'top-bid' : ''}`}>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        {i === 0 ? '🥇 ' : ''}Bidder #{bid.bidderId}
                      </div>
                      <div className="bidder">{new Date(bid.placedAt).toLocaleString()}</div>
                    </div>
                    <div className="amount">${parseFloat(bid.amount).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Bid Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={`card ${flash ? 'bid-flash' : ''}`} style={{ transition: 'background 0.5s' }}>
            <div className="bid-label" style={{ marginBottom: 4 }}>Current Bid</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent-gold)', marginBottom: 4 }}>
              ${currentBid.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Starting price: ${parseFloat(auction.startingPrice).toFixed(2)}
            </div>
            {auction.highestBidderId && (
              <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                🏆 Highest bidder: #{auction.highestBidderId}
              </div>
            )}
          </div>

          {canBid && (
            <div className="card">
              <div className="section-title">Place Your Bid</div>
              <form onSubmit={handleBid} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Bid Amount ($)</label>
                  <input
                    id="bid-amount-input"
                    type="number"
                    step="0.01"
                    min={(currentBid + 0.01).toFixed(2)}
                    className="form-input"
                    value={bidAmount}
                    onChange={e => setBidAmount(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Min bid: ${(currentBid + 0.01).toFixed(2)}
                  </span>
                </div>
                <button
                  id="place-bid-btn"
                  type="submit"
                  className="btn btn-gold btn-full"
                  disabled={placing}
                >
                  {placing ? 'Placing bid...' : `🔨 Bid $${parseFloat(bidAmount || 0).toFixed(2)}`}
                </button>
              </form>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.5 }}>
                ⚠️ Your bid amount will be frozen from your wallet immediately.
              </p>
            </div>
          )}

          {!user && (
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>Sign in to place a bid</p>
              <button className="btn btn-primary btn-full" onClick={() => navigate('/auth')}>Sign In</button>
            </div>
          )}

          {user?.role === 'SELLER' && (
            <div className="card" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--accent-gold)' }}>
                🏪 You are viewing as a Seller. Only bidders can place bids.
              </p>
            </div>
          )}

          <div className="card">
            <div className="section-title">Auction Info</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Seller ID', value: `#${auction.sellerId}` },
                { label: 'Started', value: new Date(auction.startTime).toLocaleDateString() },
                { label: 'Ends', value: new Date(auction.endTime).toLocaleString() },
                { label: 'Total Bids', value: bids.length },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
