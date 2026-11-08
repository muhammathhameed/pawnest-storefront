"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "../lib/supabase/browser";
import type { ProductReview } from "../types/product";

interface ProductReviewsProps {
  productId: string;
  reviews: ProductReview[];
  averageRating: number;
}

const reviewDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

export default function ProductReviews({
  productId,
  reviews,
  averageRating,
}: ProductReviewsProps) {
  const [rating, setRating] = useState("5");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) {
        toast.error("Sign in to share a review.");
        return;
      }

      const { error } = await supabase.from("product_reviews").insert({
        product_id: productId,
        user_id: userData.user.id,
        rating: Number(rating),
        title: title.trim(),
        body: body.trim(),
        status: "pending",
      });
      if (error) throw error;

      toast.success("Thanks! Your review was sent for approval.");
      setRating("5");
      setTitle("");
      setBody("");
    } catch (error) {
      console.error("Could not submit product review:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "We couldn't submit your review. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="product-reviews" aria-labelledby="reviews-title">
      <p className="eyebrow">REAL CUSTOMER NOTES</p>
      <div className="reviews-heading">
        <div>
          <h2 id="reviews-title">Reviews</h2>
          {reviews.length > 0 && (
            <p className="review-summary">
              Rated {averageRating.toFixed(1)} out of 5 from {reviews.length}{" "}
              {reviews.length === 1 ? "review" : "reviews"}.
            </p>
          )}
        </div>
        <Link href="/login">Sign in to write a review</Link>
      </div>
      {reviews.length === 0 ? (
        <div className="empty-reviews">
          <p>★ New — no reviews yet.</p>
          <span>Be the first to share what you think.</span>
        </div>
      ) : (
        <div className="review-list">
          {reviews.map((review) => (
            <article className="review-card" key={review.id}>
              <div className="review-card-heading">
                <h3>{review.title}</h3>
                <time dateTime={review.created_at}>
                  {reviewDate.format(new Date(review.created_at))}
                </time>
              </div>
              <p className="review-stars" aria-label={`${review.rating} out of 5 stars`}>
                {"★".repeat(review.rating)}
                <span>{"★".repeat(5 - review.rating)}</span>
              </p>
              <p>{review.body}</p>
            </article>
          ))}
        </div>
      )}
      <form className="review-form" onSubmit={submitReview}>
        <h3>Share your experience</h3>
        <label>
          Rating
          <select
            value={rating}
            onChange={(event) => setRating(event.target.value)}
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} {value === 1 ? "star" : "stars"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Review title
          <input
            required
            maxLength={100}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          Your review
          <textarea
            required
            minLength={10}
            maxLength={2000}
            rows={4}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting…" : "Submit for review"}
        </button>
      </form>
    </section>
  );
}
