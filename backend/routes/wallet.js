import express from 'express';
import axios from 'axios';
import { protect } from '../middleware/auth.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

router.use(protect);

// Get M-Pesa access token
const getAccessToken = async () => {
  try {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    
    const url = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    const response = await axios.get(url, {
      headers: {
        Authorization: `Basic ${auth}`
      }
    });

    return response.data.access_token;
  } catch (error) {
    console.error('M-Pesa token error:', error);
    throw error;
  }
};

// Get wallet balance and transactions
router.get('/', async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user._id });

    if (!wallet) {
      wallet = await Wallet.create({ user: req.user._id });
    }

    res.json({
      balance: wallet.balance,
      transactions: wallet.transactions.sort((a, b) => b.createdAt - a.createdAt)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Set or update transaction PIN (for all user types)
router.put('/transaction-pin', async (req, res) => {
  try {
    const { pin, currentPin } = req.body;
    
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ 
        message: 'PIN must be exactly 4 digits' 
      });
    }

    const user = await User.findById(req.user._id).select('+transactionPin');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If PIN already exists, require current PIN for verification
    if (user.transactionPin) {
      if (!currentPin) {
        return res.status(400).json({ 
          message: 'Current PIN is required to update your transaction PIN' 
        });
      }
      
      const isCurrentPinValid = await user.compareTransactionPin(currentPin);
      if (!isCurrentPinValid) {
        return res.status(401).json({ 
          message: 'Current PIN is incorrect' 
        });
      }
    }

    // Set new PIN (will be hashed by pre-save hook)
    user.transactionPin = pin;
    
    // Clean up activeRoute if deliveryLocation is null to prevent validation errors
    if (user.activeRoute && user.activeRoute.deliveryLocation === null) {
      if (!user.activeRoute.deliveryAddress && !user.activeRoute.area) {
        // If entire activeRoute is empty, set to undefined
        user.activeRoute = undefined;
      } else {
        // If only deliveryLocation is null, remove it
        user.activeRoute.deliveryLocation = undefined;
      }
    }
    
    await user.save();

    res.json({
      message: user.transactionPin ? 'Transaction PIN updated successfully' : 'Transaction PIN set successfully'
    });
  } catch (error) {
    console.error('Error setting transaction PIN:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to set transaction PIN' 
    });
  }
});

// Request payout (for riders)
router.post('/payout', async (req, res) => {
  try {
    if (req.user.role !== 'rider') {
      return res.status(403).json({ message: 'Only riders can request payout' });
    }

    const { amount, phone, pin } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    if (!pin) {
      return res.status(400).json({ message: 'Transaction PIN is required' });
    }

    // Verify transaction PIN
    const user = await User.findById(req.user._id).select('+transactionPin');
    if (!user.transactionPin) {
      return res.status(400).json({ 
        message: 'Transaction PIN not set. Please set your PIN in profile settings first.' 
      });
    }

    const isPinValid = await user.compareTransactionPin(pin);
    if (!isPinValid) {
      return res.status(401).json({ message: 'Invalid transaction PIN' });
    }

    const wallet = await Wallet.findOne({ user: req.user._id });

    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Check if M-Pesa credentials are configured
    // Note: SecurityCredential should be pre-encrypted using Safaricom's public key
    // Get it from Safaricom Developer Portal or use encryption tool
    const hasMpesaCredentials = process.env.MPESA_CONSUMER_KEY && 
                                 process.env.MPESA_CONSUMER_SECRET && 
                                 process.env.MPESA_SHORTCODE &&
                                 process.env.MPESA_INITIATOR_NAME &&
                                 (process.env.MPESA_SECURITY_CREDENTIAL || process.env.MPESA_INITIATOR_PASSWORD);
    
    if (!hasMpesaCredentials) {
      // If credentials are not configured, simulate payout (unless explicitly in production)
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (!isProduction) {
        console.log('M-Pesa not configured - simulating payout in development mode');
        
        // Deduct from wallet and mark as completed (simulated)
        await wallet.addTransaction('payout', parseFloat(amount), `Payout to ${phone} (Simulated)`, null, `SIM-${Date.now()}`);
        
        // Emit socket event for real-time update
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${req.user._id}`).emit('wallet_updated', {
            balance: wallet.balance,
            transaction: {
              type: 'payout',
              amount: parseFloat(amount),
              description: `Payout to ${phone} (Simulated)`
            }
          });
        }

        const updatedWallet = await Wallet.findById(wallet._id);
        return res.json({
          message: `Payout successful! KES ${amount} sent to ${phone}. (Simulated in development mode)`,
          simulated: true,
          transaction: updatedWallet.transactions[updatedWallet.transactions.length - 1]
        });
      } else {
        return res.status(500).json({ 
          message: 'M-Pesa service not configured. Please configure M-Pesa credentials in production environment.' 
        });
      }
    }

    // Format phone number (remove leading 0, add 254)
    const formattedPhone = phone.startsWith('0') ? `254${phone.slice(1)}` : phone;
    if (!formattedPhone.startsWith('254')) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Minimum amount for B2C is usually 10 KES
    if (parseFloat(amount) < 10) {
      return res.status(400).json({ message: 'Minimum payout amount is KES 10' });
    }

    // Create transaction first with pending status
    await wallet.addTransaction('payout', parseFloat(amount), `Payout request to ${phone}`, null, null);
    const transactionIndex = wallet.transactions.length - 1;
    wallet.transactions[transactionIndex].status = 'pending';
    await wallet.save();

    // Get access token
    const accessToken = await getAccessToken();

    // Get security credential for B2C
    // In production, this should be pre-encrypted using Safaricom's public key
    // For sandbox/testing, you can get it from Safaricom Developer Portal
    const initiatorName = process.env.MPESA_INITIATOR_NAME;
    // Use pre-encrypted SecurityCredential if available, otherwise use password (for sandbox only)
    const securityCredential = process.env.MPESA_SECURITY_CREDENTIAL || 
                               (process.env.MPESA_INITIATOR_PASSWORD ? 
                                Buffer.from(`${initiatorName}:${process.env.MPESA_INITIATOR_PASSWORD}`).toString('base64') : 
                                null);
    
    if (!securityCredential) {
      return res.status(500).json({ 
        message: 'M-Pesa SecurityCredential not configured. Please set MPESA_SECURITY_CREDENTIAL or MPESA_INITIATOR_PASSWORD.' 
      });
    }

    const shortcode = process.env.MPESA_SHORTCODE;
    const b2cUrl = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest'
      : 'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest';

    const callbackUrl = process.env.MPESA_B2C_CALLBACK_URL || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/mpesa/b2c-callback`;

    const transactionId = `NJIANI-PAYOUT-${Date.now()}-${req.user._id}`;

    const requestData = {
      InitiatorName: initiatorName,
      SecurityCredential: securityCredential,
      CommandID: 'BusinessPayment',
      Amount: parseFloat(amount),
      PartyA: shortcode,
      PartyB: formattedPhone,
      Remarks: `Njiani rider payout - Order: ${transactionId}`,
      QueueTimeOutURL: callbackUrl,
      ResultURL: callbackUrl,
      Occasion: 'Rider Payout'
    };

    // Store payout request for callback
    const payoutRequests = req.app.get('payoutRequests') || new Map();
    payoutRequests.set(transactionId, {
      userId: req.user._id.toString(),
      walletId: wallet._id.toString(),
      transactionIndex: transactionIndex,
      amount: parseFloat(amount),
      phone: phone,
      timestamp: new Date()
    });
    req.app.set('payoutRequests', payoutRequests);

    // Clean up old entries (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, value] of payoutRequests.entries()) {
      if (value.timestamp.getTime() < oneHourAgo) {
        payoutRequests.delete(key);
      }
    }

    const response = await axios.post(b2cUrl, requestData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('B2C payout initiated:', {
      transactionId: transactionId,
      responseCode: response.data.ResponseCode,
      responseDescription: response.data.ResponseDescription
    });

    if (response.data.ResponseCode === '0') {
      // Reload wallet to get latest state
      const updatedWallet = await Wallet.findById(wallet._id);
      
      res.json({
        message: 'Payout request submitted successfully. Processing...',
        transactionId: transactionId,
        conversationId: response.data.ConversationID,
        originatorConversationId: response.data.OriginatorConversationID,
        transaction: updatedWallet.transactions[transactionIndex],
        wallet: {
          balance: updatedWallet.balance
        }
      });
    } else {
      // Revert the transaction if API call failed
      wallet.balance += parseFloat(amount);
      wallet.transactions[transactionIndex].status = 'failed';
      await wallet.save();

      res.status(400).json({
        message: response.data.ResponseDescription || 'Failed to initiate payout',
        response: response.data
      });
    }
  } catch (error) {
    console.error('Payout error:', error.response?.data || error.message);
    
    // Try to revert transaction if it was created
    try {
      const wallet = await Wallet.findOne({ user: req.user._id });
      if (wallet && wallet.transactions.length > 0) {
        const lastTransaction = wallet.transactions[wallet.transactions.length - 1];
        if (lastTransaction.status === 'pending' && lastTransaction.type === 'payout') {
          wallet.balance += lastTransaction.amount;
          lastTransaction.status = 'failed';
          await wallet.save();
        }
      }
    } catch (revertError) {
      console.error('Error reverting transaction:', revertError);
    }

    res.status(500).json({
      message: 'Failed to process payout request',
      error: error.response?.data || error.message
    });
  }
});

export default router;

