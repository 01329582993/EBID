import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWallet, deposit, freezeFunds, releaseFunds, payoutFunds, getTransactions } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TX_ICONS = { DEPOSIT: '', FREEZE: '', RELEASE: '', PAYOUT: '', WITHDRAWAL: '' };

export default function WalletPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);

  const [activeActionModal, setActiveActionModal] = useState(null);
  const [actionAmount, setActionAmount] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const currentUserId = user?.userId || user?.id || user?._id;

  const loadWallet = useCallback(async (id) => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const res = await getWallet(id);
      setWallet(res.data);
    } catch {
      toast.error('Could not load wallet');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await getTransactions(id);
      const data = res?.data;
      if (Array.isArray(data)) {
        setTransactions(data);
      } else if (data && Array.isArray(data.content)) {
        setTransactions(data.content);
      } else {
        setTransactions([]);
      }
    } catch {
      setTransactions([]);
    
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (currentUserId) {
      loadWallet(currentUserId);
      loadTransactions(currentUserId);

      const interval = setInterval(() => {
        loadWallet(currentUserId);
        loadTransactions(currentUserId);
      }, 5000);

      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [user, currentUserId, navigate, loadWallet, loadTransactions]);

  const handleDeposit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setDepositing(true);
    try {
      await deposit({ userId: currentUserId, amount });
      toast.success(`$${amount.toFixed(2)} deposited!`);
      setShowModal(false);
      setDepositAmount('');
      loadWallet(currentUserId);
      loadTransactions(currentUserId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Deposit failed');
    } finally {
      setDepositing(false);
    }
  };

  const handleFreeze = async (e) => {
    e.preventDefault();
    const amount = parseFloat(actionAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setActionLoading(true);
    try {
      await freezeFunds({ userId: currentUserId, amount });
      toast.success(`$${amount.toFixed(2)} frozen for bid lock!`);
      closeActionModal();
      loadWallet(currentUserId);
      loadTransactions(currentUserId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to freeze funds');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRelease = async (e) => {
    e.preventDefault();
    const amount = parseFloat(actionAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setActionLoading(true);
    try {
      await releaseFunds({ userId: currentUserId, amount });
      toast.success(`$${amount.toFixed(2)} released back to balance!`);
      closeActionModal();
      loadWallet(currentUserId);
      loadTransactions(currentUserId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to release funds');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayout = async (e) => {
    e.preventDefault();
    const amount = parseFloat(actionAmount);
    const target = parseInt(targetUserId, 10);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!target) {
      toast.error('Enter recipient user ID');
      return;
    }
    setActionLoading(true);
    try {
      await payoutFunds({ fromUserId: currentUserId, toUserId: target, amount });
      toast.success(`$${amount.toFixed(2)} payout transferred to User #${target}!`);
      closeActionModal();
      loadWallet(currentUserId);
      loadTransactions(currentUserId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Payout failed');
    } finally {
      setActionLoading(false);
    }
  };

  const closeActionModal = () => {
    setActiveActionModal(null);
    setActionAmount('');
    setTargetUserId('');
  };

  if (loading) return <div className="spinner" />;

  const safeWallet = wallet || { balance: 0, availableBalance: 0, frozenBalance: 0 };
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  return (
    <div className="main-content" style={{ maxWidth: 800 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">My Wallet</h1>
          <p className="page-subtitle">Manage your funds and transaction history</p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => {
            loadWallet(currentUserId);
            loadTransactions(currentUserId);
            toast.success('Wallet updated');
          }}
        >
          Refresh Data
        </button>
      </div>
      <div className="wallet-hero">
        <div className="wallet-balance-label">Available Balance</div>
        <div className="wallet-balance">
          <span>$</span>{parseFloat(safeWallet.availableBalance || 0).toFixed(2)}
        </div>
        {parseFloat(safeWallet.frozenBalance || 0) > 0 && (
          <div className="wallet-frozen">
            <strong>${parseFloat(safeWallet.frozenBalance).toFixed(2)}</strong> frozen in active bids
          </div>
        )}
        <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            id="deposit-btn"
            className="btn btn-green"
            onClick={() => setShowModal(true)}
          >
            + Deposit Funds
          </button>
          
          <button
            className="btn btn-outline"
            style={{ borderColor: '#f59e0b', color: '#f59e0b' }}
            onClick={() => setActiveActionModal('FREEZE')}
          >
            Freeze (Bid Lock)
          </button>
          <button
            className="btn btn-outline"
            style={{ borderColor: '#10b981', color: '#10b981' }}
            onClick={() => setActiveActionModal('RELEASE')}
          >
            Release (Unfreeze)
          </button>
          <button
            className="btn btn-outline"
            style={{ borderColor: '#8b5cf6', color: '#8b5cf6' }}
            onClick={() => setActiveActionModal('PAYOUT')}
          >
            Payout Transfer
          </button>
        </div>
      </div>

      {/* Balance Breakdown */}
      <div className="stats-bar" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Balance</div>
          <div className="stat-value green">${parseFloat(safeWallet.balance || 0).toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Available</div>
          <div className="stat-value blue">${parseFloat(safeWallet.availableBalance || 0).toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Frozen (Bids)</div>
          <div className="stat-value" style={{ color: 'var(--accent-red)' }}>
            ${parseFloat(safeWallet.frozenBalance || 0).toFixed(2)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Transactions</div>
          <div className="stat-value purple">{safeTransactions.length}</div>
        </div>
      </div>


      <div className="card">
        <div className="section-title">Transaction History</div>
        {safeTransactions.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px' }}>
            <div className="empty-state-icon"></div>
            <div className="empty-state-title">No transactions yet</div>
            <p>Deposit funds to get started</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {safeTransactions.map(tx => {
              const amountVal = parseFloat(tx.amount || 0);
              const isPositive = amountVal > 0 || tx.type === 'DEPOSIT' || tx.type === 'RELEASE';
              const displayAmount = Math.abs(amountVal).toFixed(2);

              return (
                <div key={tx.id || Math.random()} className="transaction-item">
                  <div className={`tx-icon tx-${tx.type}`}>
                    {TX_ICONS[tx.type] || ''}
                  </div>
                  <div className="tx-info">
                    <div className="tx-desc">{tx.description || tx.type}</div>
                    <div className="tx-time">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ''}
                    </div>
                  </div>
                  <div className={`tx-amount ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? '+' : '-'}{displayAmount}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-title">Deposit Funds</div>
            <form onSubmit={handleDeposit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Amount ($)</label>
                <input
                  id="deposit-amount-input"
                  type="number"
                  step="0.01"
                  min="1"
                  className="form-input"
                  placeholder="100.00"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[50, 100, 250, 500].map(v => (
                  <button
                    key={v}
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setDepositAmount(String(v))}
                  >
                    ${v}
                  </button>
                ))}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button
                  id="confirm-deposit-btn"
                  type="submit"
                  className="btn btn-green"
                  disabled={depositing}
                >
                  {depositing ? 'Processing...' : 'Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeActionModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeActionModal(); }}>
          <div className="modal">
            <div className="modal-title">
              {activeActionModal === 'FREEZE' && 'Freeze Funds (Bid Lock)'}
              {activeActionModal === 'RELEASE' && 'Release Frozen Funds'}
              {activeActionModal === 'PAYOUT' && 'Execute Payout Transfer'}
            </div>
            <form onSubmit={
              activeActionModal === 'FREEZE' ? handleFreeze :
              activeActionModal === 'RELEASE' ? handleRelease : handlePayout
            } style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {activeActionModal === 'PAYOUT' && (
                <div className="form-group">
                  <label className="form-label">Recipient User ID</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="e.g. 2"
                    value={targetUserId}
                    onChange={e => setTargetUserId(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  className="form-input"
                  placeholder="100.00"
                  value={actionAmount}
                  onChange={e => setActionAmount(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={closeActionModal}>Cancel</button>
                <button type="submit" className="btn btn-green" disabled={actionLoading}>
                  {actionLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
  
}