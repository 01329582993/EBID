import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWallet, deposit, getTransactions } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TX_ICONS = { DEPOSIT: '💚', FREEZE: '🔒', RELEASE: '🔓', PAYOUT: '💸', WITHDRAWAL: '📤' };

export default function WalletPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadWallet();
    loadTransactions();
  }, [user]);

  const loadWallet = async () => {
    try {
      const res = await getWallet(user.userId);
      setWallet(res.data);
    } catch { toast.error('Could not load wallet'); }
  };

  const loadTransactions = async () => {
    try {
      const res = await getTransactions(user.userId);
      setTransactions(res.data);
    } catch { /* silent */ }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    setDepositing(true);
    try {
      await deposit({ userId: user.userId, amount });
      toast.success(`$${amount.toFixed(2)} deposited! 💰`);
      setShowModal(false);
      setDepositAmount('');
      loadWallet();
      loadTransactions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Deposit failed');
    } finally {
      setDepositing(false);
    }
  };

  if (!wallet) return <div className="spinner" />;

  return (
    <div className="main-content" style={{ maxWidth: 800 }}>
      <div className="page-header">
        <h1 className="page-title">My Wallet</h1>
        <p className="page-subtitle">Manage your funds and transaction history</p>
      </div>

      {/* Balance Hero */}
      <div className="wallet-hero">
        <div className="wallet-balance-label">Available Balance</div>
        <div className="wallet-balance">
          <span>$</span>{parseFloat(wallet.availableBalance || 0).toFixed(2)}
        </div>
        {parseFloat(wallet.frozenBalance || 0) > 0 && (
          <div className="wallet-frozen">
            🔒 <strong>${parseFloat(wallet.frozenBalance).toFixed(2)}</strong> frozen in active bids
          </div>
        )}
        <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
          <button
            id="deposit-btn"
            className="btn btn-green"
            onClick={() => setShowModal(true)}
          >
            + Deposit Funds
          </button>
        </div>
      </div>

      {/* Balance Breakdown */}
      <div className="stats-bar" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Balance</div>
          <div className="stat-value green">${parseFloat(wallet.balance || 0).toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Available</div>
          <div className="stat-value blue">${parseFloat(wallet.availableBalance || 0).toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Frozen (Bids)</div>
          <div className="stat-value" style={{ color: 'var(--accent-red)' }}>
            ${parseFloat(wallet.frozenBalance || 0).toFixed(2)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Transactions</div>
          <div className="stat-value purple">{transactions.length}</div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="card">
        <div className="section-title">Transaction History</div>
        {transactions.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px' }}>
            <div className="empty-state-icon">📄</div>
            <div className="empty-state-title">No transactions yet</div>
            <p>Deposit funds to get started</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {transactions.map(tx => {
              const isPositive = tx.amount > 0 || tx.type === 'DEPOSIT' || tx.type === 'RELEASE';
              return (
                <div key={tx.id} className="transaction-item">
                  <div className={`tx-icon tx-${tx.type}`}>
                    {TX_ICONS[tx.type] || '💳'}
                  </div>
                  <div className="tx-info">
                    <div className="tx-desc">{tx.description || tx.type}</div>
                    <div className="tx-time">
                      {new Date(tx.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className={`tx-amount ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? '+' : ''}{parseFloat(tx.amount).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-title">💰 Deposit Funds</div>
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
    </div>
  );
}
