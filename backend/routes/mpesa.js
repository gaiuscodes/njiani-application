import express from 'express';
import axios from 'axios';
import { protect } from '../middleware/auth.js';
import Wallet from '../models/Wallet.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

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

// Generate password for STK push
const generatePassword = () => {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
  return { password, timestamp };
};

// Store STK push requests temporarily (in production, use Redis or database)
const stkPushRequests = new Map();

// Store B2C payout requests temporarily (in production, use Redis or database)
const b2cPayoutRequests = new Map();

// Initiate STK push
router.post('/stk-push', protect, async (req, res) => {
  try {
    const { amount, phone } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const phoneToUse = phone || req.user.phone;
    if (!phoneToUse) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Check if M-Pesa credentials are configured
    const hasMpesaCredentials = process.env.MPESA_CONSUMER_KEY && 
                                 process.env.MPESA_CONSUMER_SECRET && 
                                 process.env.MPESA_SHORTCODE;
    
    if (!hasMpesaCredentials) {
      // If credentials are not configured, simulate payment (unless explicitly in production)
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (!isProduction) {
        console.log('M-Pesa not configured - simulating payment in development mode');
        const wallet = await Wallet.findOne({ user: req.user._id });
        if (wallet) {
          await wallet.addTransaction(
            'topup',
            parseFloat(amount),
            `Top-up (M-Pesa not configured - simulated)`,
            null,
            `SIM-${Date.now()}`
          );
          
          // Emit socket event for real-time update
          const io = req.app.get('io');
          if (io) {
            io.to(`user_${req.user._id}`).emit('wallet_updated', {
              balance: wallet.balance,
              transaction: {
                type: 'topup',
                amount: parseFloat(amount),
                description: 'Top-up (simulated)'
              }
            });
          }
        }
        return res.json({
          message: `Top-up successful! KES ${amount} added to your wallet. (Simulated in development mode)`,
          simulated: true,
          wallet: wallet ? { balance: wallet.balance } : null
        });
      } else {
        // In production without credentials, return error
        return res.status(500).json({ 
          message: 'M-Pesa service not configured. Please configure M-Pesa credentials in production environment.' 
        });
      }
    }

    const accessToken = await getAccessToken();
    const { password, timestamp } = generatePassword();

    const shortcode = process.env.MPESA_SHORTCODE;
    const callbackUrl = process.env.MPESA_CALLBACK_URL || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/mpesa/callback`;

    const url = process.env.MPESA_ENVIRONMENT === 'production'
      ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
      : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

    // Format phone number (remove leading 0, add 254)
    const formattedPhone = phoneToUse.startsWith('0') ? `254${phoneToUse.slice(1)}` : phoneToUse;

    const merchantRequestID = `NJIANI-${Date.now()}-${req.user._id}`;
    
    const requestData = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: parseInt(amount),
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: `NJIANI-${req.user._id}`,
      TransactionDesc: 'Njiani Wallet Top-up'
    };

    // Store the mapping for callback
    stkPushRequests.set(merchantRequestID, {
      userId: req.user._id.toString(),
      phone: phoneToUse,
      amount: parseFloat(amount),
      timestamp: new Date()
    });

    // Clean up old entries (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, value] of stkPushRequests.entries()) {
      if (value.timestamp.getTime() < oneHourAgo) {
        stkPushRequests.delete(key);
      }
    }

    const response = await axios.post(url, requestData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('STK push initiated:', {
      merchantRequestID: response.data.MerchantRequestID || merchantRequestID,
      checkoutRequestID: response.data.CheckoutRequestID,
      responseCode: response.data.ResponseCode,
      responseDescription: response.data.ResponseDescription
    });

    if (response.data.ResponseCode === '0') {
      res.json({
        message: 'STK push sent! Please check your phone and enter your M-Pesa PIN to complete the payment.',
        checkoutRequestID: response.data.CheckoutRequestID,
        merchantRequestID: response.data.MerchantRequestID || merchantRequestID
      });
    } else {
      res.status(400).json({
        message: response.data.ResponseDescription || 'Failed to initiate STK push',
        response: response.data
      });
    }
  } catch (error) {
    console.error('STK push error:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Failed to initiate payment',
      error: error.response?.data || error.message
    });
  }
});

// M-Pesa callback handler
router.post('/callback', async (req, res) => {
  try {
    console.log('M-Pesa callback received:', JSON.stringify(req.body, null, 2));
    
    const { Body } = req.body;
    const stkCallback = Body?.stkCallback;

    if (!stkCallback) {
      console.log('No stkCallback in body');
      return res.status(200).json({ message: 'Callback received' });
    }

    if (stkCallback.ResultCode === 0) {
      // Payment successful
      const metadata = stkCallback.CallbackMetadata?.Item || [];
      const amountItem = metadata.find(item => item.Name === 'Amount');
      const receiptItem = metadata.find(item => item.Name === 'MpesaReceiptNumber');
      const phoneItem = metadata.find(item => item.Name === 'PhoneNumber');
      
      const amount = amountItem?.Value;
      const mpesaReceiptNumber = receiptItem?.Value;
      const phoneNumber = phoneItem?.Value;

      console.log('Payment successful:', { amount, mpesaReceiptNumber, phoneNumber });

      // Extract user ID from stored mapping or AccountReference
      const merchantRequestId = stkCallback.MerchantRequestID || req.body.MerchantRequestID;
      let userId = null;
      
      // Try to get from stored mapping
      if (merchantRequestId && stkPushRequests.has(merchantRequestId)) {
        const stored = stkPushRequests.get(merchantRequestId);
        userId = stored.userId;
        stkPushRequests.delete(merchantRequestId); // Clean up
      }
      
      // If not found, try to extract from AccountReference
      if (!userId) {
        const accountReference = stkCallback.MerchantRequestID || '';
        const userIdMatch = accountReference.match(/NJIANI-(.+)/);
        if (userIdMatch) {
          userId = userIdMatch[1];
        }
      }
      
      // If still not found, try to find by phone number
      if (!userId && phoneNumber && amount) {
        // Format phone back to local format (254... to 0...)
        const localPhone = phoneNumber.startsWith('254') 
          ? `0${phoneNumber.slice(3)}` 
          : phoneNumber;
        
        // Find user by phone
        const User = (await import('../models/User.js')).default;
        const user = await User.findOne({ phone: localPhone });
        if (user) {
          userId = user._id.toString();
        }
      }
      
      if (userId && amount) {
        const wallet = await Wallet.findOne({ user: userId });
        if (wallet) {
          await wallet.addTransaction(
            'topup',
            amount,
            `M-Pesa top-up - ${mpesaReceiptNumber}`,
            null,
            mpesaReceiptNumber
          );
          console.log('✅ Wallet updated for user:', userId, 'Amount:', amount, 'Receipt:', mpesaReceiptNumber);
        } else {
          console.error('Wallet not found for user:', userId);
        }
      } else {
        console.error('Could not determine user ID for callback. Amount:', amount);
      }
    } else {
      console.log('Payment failed. ResultCode:', stkCallback.ResultCode, 'ResultDesc:', stkCallback.ResultDesc);
    }

    res.status(200).json({ message: 'Callback received' });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(200).json({ message: 'Callback received' }); // Always return 200 to M-Pesa
  }
});

// M-Pesa B2C payout callback handler
router.post('/b2c-callback', async (req, res) => {
  try {
    console.log('M-Pesa B2C callback received:', JSON.stringify(req.body, null, 2));
    
    const result = req.body.Result;
    
    if (!result) {
      console.log('No Result in B2C callback body');
      return res.status(200).json({ message: 'Callback received' });
    }

    const resultCode = result.ResultCode;
    const resultDesc = result.ResultDesc;
    const conversationId = result.ConversationID;
    const originatorConversationId = result.OriginatorConversationID;
    const transactionId = result.TransactionID;

    // Extract transaction details
    const resultParameters = result.ResultParameters?.ResultParameter || [];
    const amountItem = resultParameters.find(item => item.Key === 'Amount');
    const receiptItem = resultParameters.find(item => item.Key === 'TransactionReceipt');
    const phoneItem = resultParameters.find(item => item.Key === 'ReceiverPartyPublicName');
    const transactionDateItem = resultParameters.find(item => item.Key === 'TransactionCompletedDateTime');

    const amount = amountItem?.Value;
    const receiptNumber = receiptItem?.Value;
    const phoneNumber = phoneItem?.Value;
    const transactionDate = transactionDateItem?.Value;

    console.log('B2C payout result:', {
      resultCode,
      resultDesc,
      amount,
      receiptNumber,
      phoneNumber,
      transactionDate
    });

    // Find the payout request by conversation ID or transaction ID
    let payoutRequest = null;
    for (const [key, value] of b2cPayoutRequests.entries()) {
      if (key.includes(conversationId) || key.includes(originatorConversationId) || key.includes(transactionId)) {
        payoutRequest = value;
        b2cPayoutRequests.delete(key);
        break;
      }
    }

    // Also check app-level storage (from wallet route)
    if (!payoutRequest && req.app.get) {
      const appPayoutRequests = req.app.get('payoutRequests');
      if (appPayoutRequests) {
        for (const [key, value] of appPayoutRequests.entries()) {
          if (key.includes(conversationId) || key.includes(originatorConversationId) || key.includes(transactionId)) {
            payoutRequest = value;
            appPayoutRequests.delete(key);
            break;
          }
        }
      }
    }

    if (resultCode === 0 && payoutRequest) {
      // Payout successful
      const wallet = await Wallet.findById(payoutRequest.walletId);
      if (wallet) {
        // Update transaction status to completed
        if (wallet.transactions[payoutRequest.transactionIndex]) {
          wallet.transactions[payoutRequest.transactionIndex].status = 'completed';
          wallet.transactions[payoutRequest.transactionIndex].mpesaReference = receiptNumber || transactionId;
          wallet.transactions[payoutRequest.transactionIndex].description = `Payout to ${payoutRequest.phone} - ${receiptNumber || transactionId}`;
        }
        await wallet.save();

        console.log('✅ Payout completed for user:', payoutRequest.userId, 'Amount:', amount, 'Receipt:', receiptNumber);

        // Emit socket event for real-time update
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${payoutRequest.userId}`).emit('wallet_updated', {
            balance: wallet.balance,
            transaction: {
              type: 'payout',
              amount: payoutRequest.amount,
              description: `Payout to ${payoutRequest.phone}`,
              status: 'completed'
            }
          });
        }
      } else {
        console.error('Wallet not found for payout:', payoutRequest.walletId);
      }
    } else if (resultCode !== 0 && payoutRequest) {
      // Payout failed - revert transaction
      const wallet = await Wallet.findById(payoutRequest.walletId);
      if (wallet) {
        // Refund the amount
        wallet.balance += payoutRequest.amount;
        if (wallet.transactions[payoutRequest.transactionIndex]) {
          wallet.transactions[payoutRequest.transactionIndex].status = 'failed';
          wallet.transactions[payoutRequest.transactionIndex].description = `Payout failed: ${resultDesc}`;
        }
        await wallet.save();

        console.log('❌ Payout failed for user:', payoutRequest.userId, 'Reason:', resultDesc);

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${payoutRequest.userId}`).emit('wallet_updated', {
            balance: wallet.balance,
            transaction: {
              type: 'payout',
              amount: payoutRequest.amount,
              description: `Payout failed: ${resultDesc}`,
              status: 'failed'
            }
          });
        }
      }
    } else {
      console.log('Could not find payout request for callback:', {
        conversationId,
        originatorConversationId,
        transactionId
      });
    }

    res.status(200).json({ message: 'B2C callback received' });
  } catch (error) {
    console.error('B2C callback error:', error);
    res.status(200).json({ message: 'B2C callback received' }); // Always return 200 to M-Pesa
  }
});

export default router;

