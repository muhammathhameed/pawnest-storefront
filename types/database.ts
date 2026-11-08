export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          name: string;
          price: number;
          description: string | null;
          category: string | null;
          image_url: string | null;
          stock_quantity: number;
          rating: number;
          supplier_id: string | null;
          sku: string | null;
          cost_price: number | null;
          compare_at_price: number | null;
          short_description: string | null;
          full_description_html: string | null;
          tags: string[];
          seo_title: string | null;
          seo_description: string | null;
          gallery_images: string[];
          key_highlights: string[];
          specifications: Json;
          variants: Json;
          status: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          description?: string | null;
          category?: string | null;
          image_url?: string | null;
          stock_quantity?: number;
          rating?: number;
          supplier_id?: string | null;
          sku?: string | null;
          cost_price?: number | null;
          compare_at_price?: number | null;
          short_description?: string | null;
          full_description_html?: string | null;
          tags?: string[];
          seo_title?: string | null;
          seo_description?: string | null;
          gallery_images?: string[];
          key_highlights?: string[];
          specifications?: Json;
          variants?: Json;
          status?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          description?: string | null;
          category?: string | null;
          image_url?: string | null;
          stock_quantity?: number;
          rating?: number;
          supplier_id?: string | null;
          sku?: string | null;
          cost_price?: number | null;
          compare_at_price?: number | null;
          short_description?: string | null;
          full_description_html?: string | null;
          tags?: string[];
          seo_title?: string | null;
          seo_description?: string | null;
          gallery_images?: string[];
          key_highlights?: string[];
          specifications?: Json;
          variants?: Json;
          status?: string;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          stripe_event_id: string | null;
          event_type: string | null;
          processed_at: string | null;
          status: string | null;
        };
        Insert: {
          stripe_event_id?: string | null;
          event_type?: string | null;
          processed_at?: string | null;
          status?: string | null;
        };
        Update: {
          stripe_event_id?: string | null;
          event_type?: string | null;
          processed_at?: string | null;
          status?: string | null;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          stripe_session_id: string | null;
          customer_email: string | null;
          customer_user_id: string | null;
          total_amount: number;
          payment_status: string;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          stripe_session_id?: string | null;
          customer_email?: string | null;
          customer_user_id?: string | null;
          total_amount: number;
          payment_status: string;
          currency: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          stripe_session_id?: string | null;
          customer_email?: string | null;
          customer_user_id?: string | null;
          total_amount?: number;
          payment_status?: string;
          currency?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
        };
        Update: {
          order_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      process_stripe_checkout_order: {
        Args: {
          p_stripe_event_id: string;
          p_event_type: string;
          p_stripe_session_id: string;
          p_customer_email: string | null;
          p_customer_user_id: string | null;
          p_total_amount: number;
          p_payment_status: string;
          p_currency: string;
          p_items: Array<{
            product_id: string;
            quantity: number;
            unit_price: number;
          }>;
        };
        Returns: Json;
      };
      record_stripe_webhook_audit: {
        Args: {
          p_stripe_event_id: string;
          p_event_type: string;
          p_status: string;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
