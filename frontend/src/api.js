import axios from 'axios';

const authApi = axios.create({ baseURL: '/api/auth' });
const auctionApi = axios.create({ baseURL: '/api/auctions' });
const walletApi = axios.create({ baseURL: '/api/wallet' });

// Attach JWT token to every request
[authApi, auctionApi, walletApi].forEach(api => {
  api.interceptors.request.use(config => {
    const token = localStorage.getItem('ebid_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
});

// Auth
export const register = (data) => authApi.post('/auth/register', data);
export const login = (data) => authApi.post('/auth/login', data);
export const validateToken = () => authApi.get('/auth/validate');

// Auctions
export const getActiveAuctions = () => auctionApi.get('/auctions');
export const getAllAuctions = () => auctionApi.get('/auctions/all');
export const getAuction = (id) => auctionApi.get(`/auctions/${id}`);
export const createAuction = (data) => auctionApi.post('/auctions', data);
export const placeBid = (id, data) => auctionApi.post(`/auctions/${id}/bid`, data);
export const getBidHistory = (id) => auctionApi.get(`/auctions/${id}/bids`);
export const getSellerAuctions = (sellerId) => auctionApi.get(`/auctions/seller/${sellerId}`);

// Wallet
export const getWallet = (userId) => walletApi.get(`/wallet/${userId}`);
export const deposit = (data) => walletApi.post('/wallet/deposit', data);
export const getTransactions = (userId) => walletApi.get(`/wallet/${userId}/transactions`);
