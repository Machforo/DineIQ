import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';

// Apna Stripe Public Key yahan dalein
const stripePromise = loadStripe('pk_test_YOUR_STRIPE_PUBLIC_KEY'); 

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Cart se total amount receive karna (agar direct aa raha hai to)
  // Fallback 0 rakha hai taaki error na aaye
  const { totalAmount } = location.state || { totalAmount: 0 }; 

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);

  // Cash Payment Handler
  const handleCashPayment = () => {
    setLoading(true);
    // Yahan backend API call hogi order save karne ke liye
    setTimeout(() => {
      setLoading(false);
      // Success page ya Bill generation par bhej dein
      alert(`Order Placed Successfully! Please pay ₹${totalAmount} at the counter.`);
      navigate('/order-success'); // Yahan aap apne success page ka route dalein
    }, 1500);
  };

  // Online (Stripe) Payment Handler
  const handleOnlinePayment = async () => {
    setLoading(true);
    const stripe = await stripePromise;

    // Yahan aapko backend se session ID mangwani padegi
    // Example call:
    // const response = await fetch('/create-checkout-session', { method: 'POST' });
    // const session = await response.json();
    
    // Abhi ke liye bas alert dikha raha hu (Integration ke time uncomment karein)
    alert("Stripe Gateway Opening... (Backend Integration Required)");
    setLoading(false);

    // Actual redirect code:
    // const result = await stripe.redirectToCheckout({
    //   sessionId: session.id,
    // });
    // if (result.error) alert(result.error.message);
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
          <span className="text-2xl font-bold text-gray-800">₹{totalAmount}</span>
        </div>
      </div>

      {/* Payment Options */}
      <div className="space-y-4">
        {/* Cash Option */}
        <label 
          className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
            paymentMethod === 'cash' ? 'border-red-500 bg-red-50' : 'border-gray-200'
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
          className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
            paymentMethod === 'online' ? 'border-red-500 bg-red-50' : 'border-gray-200'
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
    </div>
  );
};

export default Payment;