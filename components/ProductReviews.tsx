'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';
import { toast } from 'sonner';

interface Review {
  id: string;
  user_id: string;
  rating: number;
  title: string;
  comment: string;
  created_at: string;
}

interface ProductReviewsProps {
  productId: string;
  reviews: Review[];
}

export default function ProductReviews({ productId, reviews }: ProductReviewsProps) {
  const [rating, setRating] = useState('5');
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        toast.error('Please log in to submit a review.');
        setIsSubmitting(false);
        return;
      }

      // Use explicit type cast to bypass strict generic table inference on untyped Supabase client
      const { error } = await (supabase.from('product_reviews') as any).insert({
        product_id: productId,
        user_id: userData.user.id,
        rating: Number(rating),
        title: title.trim(),
        comment: comment.trim(),
      });

      if (error) {
        toast.error(`Failed to submit review: ${error.message}`);
      } else {
        toast.success('Review submitted successfully!');
        setTitle('');
        setComment();
        window.location.reload();
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message || 'Something went wrong'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl my-6">
      <h3 className="text-lg font-bold text-white mb-4">Customer Reviews</h3>

      {/* Review Submission Form */}
      <form onSubmit={handleSubmitReview} className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 mb-6 space-y-4">
        <h4 className="text-sm font-semibold text-slate-200">Write a Review</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Rating</label>
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="5">5 Stars - Excellent</option>
              <option value="4">4 Stars - Very Good</option>
              <option value="3">3 Stars - Good</option>
              <option value="2">2 Stars - Fair</option>
              <option value="1">1 Star - Poor</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Absolutely love this!"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Review</label>
          <textarea
            required
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share details about your experience..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-xl text-sm transition-all cursor-pointer shadow-lg"
        >
          {isSubmitting ? 'Submitting...' : 'Post Review'}
        </button>
      </form>

      {/* Review List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-6">No reviews yet. Be the first to review!</div>
        ) : (
          reviews.map((rev) => (
            <div key={rev.id} className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 text-amber-400 text-xs">
                  {Array.from({ length: rev.rating }).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
                <span className="text-[11px] text-slate-500">
                  {new Date(rev.created_at).toLocaleDateString()}
                </span>
              </div>
              <h5 className="text-sm font-bold text-slate-200">{rev.title}</h5>
              <p className="text-xs text-slate-400 mt-1">{rev.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
