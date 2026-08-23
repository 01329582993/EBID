import axios from 'axios';

// Appending /wallet passes the prefix through Nginx proxy_pass
const authApi = axios.create({ baseURL: '/api/auth/auth' });
const auctionApi = axios.create({ baseURL: '/api/auctions/auctions' });
const walletApi = axios.create({ baseURL: '/api/wallet/wallet' });

// Attach JWT token to every request
[authApi, auctionApi, walletApi].forEach(api => {
  api.interceptors.request.use(config => {
    const token = localStorage.getItem('ebid_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
});

// Auth
export const register = (data) => authApi.post('/register', data);
export const login = (data) => authApi.post('/login', data);
export const validateToken = () => authApi.get('/validate');

// Auctions
export const getActiveAuctions = () => auctionApi.get('');
export const getAllAuctions = () => auctionApi.get('/all');
export const getAuction = (id) => auctionApi.get(`/${id}`);
export const createAuction = (data) => auctionApi.post('', data);
export const placeBid = (id, data) => auctionApi.post(`/${id}/bid`, data);
export const getBidHistory = (id) => auctionApi.get(`/${id}/bids`);
export const getSellerAuctions = (sellerId) => auctionApi.get(`/seller/${sellerId}`);

// Wallet Service
export const getWallet = (userId) => walletApi.get(`/${userId}`);
export const deposit = (data) => walletApi.post('/deposit', data);
export const freezeFunds = (data) => walletApi.post('/freeze', data);
export const releaseFunds = (data) => walletApi.post('/release', data);
export const payoutFunds = (data) => walletApi.post('/payout', data);
export const getTransactions = (userId) => walletApi.get(`/${userId}/transactions`);