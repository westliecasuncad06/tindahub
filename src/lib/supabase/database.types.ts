// Generated from versioned migrations by npm run db:types. Do not hand-edit.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
export type Database = {
  public: {
    Tables: {
      cash_drawer: {
        Row: {
          id: string;
          store_id: string;
          type: string;
          amount: number;
          note: string;
          business_date: string;
          actual_amount: number | null;
          variance: number | null;
          ref_sale_id: string | null;
          expense_id: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          color: string;
          sort_order: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      customer_debts: {
        Row: {
          id: string;
          store_id: string;
          customer_name: string;
          customer_phone: string;
          sale_id: string | null;
          total_amount: number;
          paid_amount: number;
          balance: number;
          status: string;
          due_date: string | null;
          notes: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      debt_payments: {
        Row: {
          id: string;
          store_id: string;
          debt_id: string;
          amount: number;
          payment_date: string;
          note: string;
          is_downpayment: boolean;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          store_id: string;
          category: string;
          description: string;
          amount: number;
          expense_date: string;
          from_drawer: boolean;
          is_deleted: boolean;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          sku: string;
          category_id: string | null;
          unit: string;
          cost_price: number;
          selling_price: number;
          stock_qty: number;
          reorder_level: number;
          is_active: boolean;
          expires_on: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          name: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      sale_items: {
        Row: {
          id: string;
          store_id: string;
          sale_id: string;
          product_id: string;
          product_name: string;
          qty: number;
          unit_price: number;
          unit_cost: number;
          line_total: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      sales: {
        Row: {
          id: string;
          store_id: string;
          receipt_no: string;
          request_id: string;
          subtotal: number;
          discount: number;
          total: number;
          cash_received: number;
          change_given: number;
          cogs_total: number;
          profit_total: number;
          status: string;
          is_credit: boolean;
          customer_name: string;
          note: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      settings: {
        Row: {
          store_id: string;
          store_name: string;
          owner_name: string;
          address: string;
          phone: string;
          receipt_footer: string;
          profit_target: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      stock_movements: {
        Row: {
          id: string;
          store_id: string;
          product_id: string;
          type: string;
          qty_change: number;
          qty_after: number;
          unit_cost: number;
          reason: string;
          ref_sale_id: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      store_members: {
        Row: {
          store_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      stores: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      app_snapshot: { Args: { p_store_id?: string | null }; Returns: Json };
      app_command: {
        Args: { p_store_id: string; command: Json };
        Returns: Json;
      };
      create_store: {
        Args: { store_name: string; owner_name: string };
        Returns: Json;
      };
      add_staff: {
        Args: { p_store_id: string; p_email: string };
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
