import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';

// Apna Stripe Public Key yahan dalein
import { useUser } from '@/contexts/UserContext';
import { useCart } from '@/contexts/CartContext';
import { api } from '@/api';
import { toast } from 'sonner';
import StripeDummyModal from '@/components/StripeDummyModal';
import CashDummyModal from '@/components/CashDummyModal';
import { saveLog } from '@/utils/logger';

const stripePromise = loadStripe('pk_test_YOUR_STRIPE_PUBLIC_KEY');

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshOrders } = useUser();
  const { clearCart } = useCart();

  // Cart se data receive karna
  const { totalAmount, cartItems, instructions } = location.state || { totalAmount: 0, cartItems: [], instructions: "" };

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  // Cash Payment Handler
  const handleCashPayment = async () => {
    setShowStatusModal(true);
    setOrderStatus('processing');

    // Start backend call immediately
    const orderData = {
      customer_email: user?.email || "guest@dineiq.ai",
      cart_items: cartItems,
      final_total: totalAmount,
      discount_amount: 0,
      payment_method: 'CASH',
      instructions: instructions
    };

    try {
      // Parallelize: Wait at least 1s for processing animation (standardized)
      const [response] = await Promise.all([
        api.placeOrder(orderData),
        new Promise(resolve => setTimeout(resolve, 1000))
      ]);

      if (response && response.status === "success") {
        setOrderStatus('success');

        // Log the successful order
        saveLog(
          user?.email || "Guest",
          "ORDER_PLACED",
          `Method: CASH, Total: KSh ${totalAmount}`
        );

        clearCart();
        refreshOrders(); // Non-blocking fetch

        // Wait for 1s for success confirmation (standardized)
        await new Promise(resolve => setTimeout(resolve, 1000));
        navigate('/home');
      } else {
        setShowStatusModal(false);
        toast.error(response?.message || "Failed to place order. Please try again.");
      }
    } catch (error) {
      setShowStatusModal(false);
      console.error("Payment Error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setOrderStatus('idle');
    }
  };

  // Online (Stripe) Payment Handler (Mock Update)
  const handleOnlinePayment = async () => {
    setShowStripeModal(true);
  };

  const paymentPromiseRef = useRef<Promise<any> | null>(null);

  // Triggered as soon as 'Pay' is clicked in Modal
  const handlePaymentAttempt = () => {
    const orderData = {
      customer_email: user?.email || "guest@dineiq.ai",
      cart_items: cartItems,
      final_total: totalAmount,
      discount_amount: 0,
      payment_method: 'ONLINE',
      instructions: instructions
    };
    // Start placing order in background immediately
    paymentPromiseRef.current = api.placeOrder(orderData);
  };

  const handleStripeSuccess = async () => {
    setLoading(true);
    try {
      // If for some reason handlePaymentAttempt wasn't called (shouldn't happen with current UI)
      if (!paymentPromiseRef.current) {
        const orderData = {
          customer_email: user?.email || "guest@dineiq.ai",
          cart_items: cartItems,
          final_total: totalAmount,
          discount_amount: 0,
          payment_method: 'ONLINE',
          instructions: instructions
        };
        paymentPromiseRef.current = api.placeOrder(orderData);
      }

      const response = await paymentPromiseRef.current;

      if (response && response.status === "success") {
        // Log the successful order
        saveLog(
          user?.email || "Guest",
          "ORDER_PLACED",
          `Method: ONLINE, Total: KSh ${totalAmount}`
        );

        clearCart();
        refreshOrders();

        // Wait for 1 second so the user can see the "Success" checkmark
        await new Promise(resolve => setTimeout(resolve, 1000));

        navigate('/home');
      } else {
        setShowStripeModal(false);
        toast.error(response?.message || "Payment Failed. Please try again.");
      }
    } catch (error) {
      setShowStripeModal(false);
      console.error("Online Payment Error:", error);
      toast.error("Something went wrong with the payment.");
    } finally {
      setLoading(false);
      paymentPromiseRef.current = null;
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button onClick={() => navigate(-1)} className="mr-4 text-xl">←</button>
        <h1 className="text-xl font-bold">Payment Options</h1>
      </div>

      {/* Bill Summary */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">Total to Pay</span>
          <span className="text-2xl font-bold text-gray-800">KSh {totalAmount}</span>
        </div>
      </div>

      {/* Payment Options */}
      <div className="space-y-4">
        {/* Cash Option */}
        <label
          className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'cash' ? 'border-red-500 bg-red-50' : 'border-gray-200'
            }`}
        >
          <input
            type="radio"
            name="payment"
            value="cash"
            checked={paymentMethod === 'cash'}
            onChange={() => setPaymentMethod('cash')}
            className="w-5 h-5 text-red-500"
          />
          <div className="ml-4">
            <h3 className="font-semibold">Cash / Pay at Counter</h3>
            <p className="text-sm text-gray-500">Pay cash directly at the reception.</p>
          </div>
        </label>

        {/* Online Option */}
        <label
          className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'online' ? 'border-red-500 bg-red-50' : 'border-gray-200'
            }`}
        >
          <input
            type="radio"
            name="payment"
            value="online"
            checked={paymentMethod === 'online'}
            onChange={() => setPaymentMethod('online')}
            className="w-5 h-5 text-red-500"
          />
          <div className="ml-4">
            <h3 className="font-semibold">Pay Online</h3>
            <p className="text-sm text-gray-500">Credit Card, Debit Card, UPI (via Stripe)</p>
          </div>
        </label>
      </div>

      {/* Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <button
          onClick={paymentMethod === 'cash' ? handleCashPayment : handleOnlinePayment}
          disabled={loading}
          className="w-full bg-red-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-red-700 transition disabled:bg-gray-400"
        >
          {loading ? 'Processing...' : paymentMethod === 'cash' ? 'Place Order (Cash)' : 'Pay Now'}
        </button>
      </div>

      {/* Stripe Dummy Modal */}
      <StripeDummyModal
        isOpen={showStripeModal}
        onClose={() => setShowStripeModal(false)}
        onSuccess={handleStripeSuccess}
        onPaymentAttempt={handlePaymentAttempt}
        amount={totalAmount}
        userEmail={user?.email}
        userName={user?.name}
      />
      {/* Cash Dummy Modal */}
      <CashDummyModal
        isOpen={showStatusModal}
        status={orderStatus}
      />
    </div>
  );
};

export default Payment;