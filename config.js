// config.js - API Configuration and Helper Functions
// This file handles all API calls to the PHP backend

// Get the base URL for API (calls api.php directly)
const getAPIBase = () => {
    const path = window.location.pathname;
    const directory = path.substring(0, path.lastIndexOf('/'));
    return window.location.origin + directory + '/api.php';
};

const API_BASE = getAPIBase();

const API = {
    // Generic API call function
    call: async function(endpoint, method = 'GET', data = null) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        try {
            // Call api.php with endpoint as query parameter
            const url = `${API_BASE}?endpoint=${endpoint}`;
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, error: error.message };
        }
    },

    // User Authentication
    login: async function(username, password) {
        return await this.call('login', 'POST', { username, password });
    },

    register: async function(userData) {
        return await this.call('register', 'POST', userData);
    },

    // User Management
    getUser: async function(username) {
        return await this.call(`user/${username}`, 'GET');
    },

    updateUser: async function(username, userData) {
        return await this.call(`user/${username}`, 'PUT', userData);
    },

    getUsers: async function() {
        return await this.call('users', 'GET');
    },

    deleteUser: async function(username) {
        return await this.call(`user/${username}`, 'DELETE');
    },

    // Admin Authentication
    adminLogin: async function(username, password) {
        return await this.call('admin/login', 'POST', { username, password });
    },

    // Transaction Management
    addTransaction: async function(username, transaction) {
        return await this.call(`transaction/${username}`, 'POST', transaction);
    },

    getTransactions: async function(username) {
        return await this.call(`transactions/${username}`, 'GET');
    },

    // MoneyFlow Management (Admin)
    addMoneyFlow: async function(flowData) {
        return await this.call('moneyflow', 'POST', flowData);
    },

    getMoneyFlows: async function() {
        return await this.call('moneyflow', 'GET');
    },

    updateMoneyFlow: async function(id, status) {
        return await this.call(`moneyflow/${id}`, 'PUT', { status });
    },

    deleteMoneyFlow: async function(id) {
        return await this.call(`moneyflow/${id}`, 'DELETE');
    },

    // Check Deposit Management (Admin)
    addCheckDeposit: async function(checkData) {
        return await this.call('checkdeposit', 'POST', checkData);
    },

    getCheckDeposits: async function() {
        return await this.call('checkdeposit', 'GET');
    },

    updateCheckDeposit: async function(id, status) {
        return await this.call(`checkdeposit/${id}`, 'PUT', { status });
    },

    deleteCheckDeposit: async function(id) {
        return await this.call(`checkdeposit/${id}`, 'DELETE');
    },

    // Balance Updates
    updateBalance: async function(username, newBalance, checkingBalance = null, savingsBalance = null) {
        return await this.call(`balance/${username}`, 'PUT', {
            balance: newBalance,
            checkingBalance: checkingBalance,
            savingsBalance: savingsBalance
        });
    }
};

// Helper Functions
const APIHelper = {
    // Format date to readable format
    formatDate: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Format currency
    formatCurrency: function(amount) {
        return '$' + parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    // Generate unique ID
    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Get current date-time
    getCurrentDateTime: function() {
        return new Date().toISOString();
    },

    // Validate email
    isValidEmail: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Validate phone
    isValidPhone: function(phone) {
        const re = /^\+?[\d\s\-()]{10,}$/;
        return re.test(phone);
    }
};

// Make functions globally available
window.API = API;
window.APIHelper = APIHelper;

console.log('✅ API Configuration Loaded Successfully');
console.log('📍 API Base URL:', API_BASE);