import { useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import Navbar from '../../components/public/Navbar';
import { Link } from 'react-router-dom';

export default function SendMessagePage() {
  const [form, setForm] = useState({
    senderName: '',
    senderEmail: '',
    senderDepartment: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();

    if (!form.senderName.trim() || !form.senderEmail.trim() || !form.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.senderEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await API.post('/messages', {
        senderName: form.senderName.trim(),
        senderEmail: form.senderEmail.trim(),
        senderDepartment: form.senderDepartment.trim(),
        message: form.message.trim()
      });
      toast.success('Message sent successfully!');
      setSubmitted(true);
      setTimeout(() => {
        setForm({ senderName: '', senderEmail: '', senderDepartment: '', message: '' });
        setSubmitted(false);
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      <Navbar />
      
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <Link to="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block">
              ← Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Send us a Message</h1>
            <p className="text-gray-600 dark:text-gray-400">Have questions or suggestions? Get in touch with our team.</p>
          </div>

          <div className="card bg-white dark:bg-dark-card">
            {submitted ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4 animate-bounce">✓</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Message Sent!</h2>
                <p className="text-gray-600 dark:text-gray-400">Thank you for reaching out. We'll get back to you soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. John Doe"
                    value={form.senderName}
                    onChange={e => setForm({ ...form, senderName: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="e.g. john@college.edu"
                    value={form.senderEmail}
                    onChange={e => setForm({ ...form, senderEmail: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. BCA, MCA, MBA"
                    value={form.senderDepartment}
                    onChange={e => setForm({ ...form, senderDepartment: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="input-field"
                    rows="6"
                    placeholder="Type your message here..."
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {form.message.length} characters
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 rounded-xl font-semibold text-lg"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin inline-block mr-2">⌛</span>
                      Sending...
                    </>
                  ) : (
                    '✉️ Send Message'
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-dark-card rounded-lg p-4 text-center border border-gray-200 dark:border-dark-border">
              <div className="text-2xl mb-2">📧</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Send us a message anytime</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-lg p-4 text-center border border-gray-200 dark:border-dark-border">
              <div className="text-2xl mb-2">⚡</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Quick response guaranteed</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-lg p-4 text-center border border-gray-200 dark:border-dark-border">
              <div className="text-2xl mb-2">✓</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">100% confidential</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
