"use client";

import { Toaster } from "sonner";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          borderRadius: "12px",
          fontFamily: '"DM Sans", sans-serif',
        },
      }}
    />
  );
}
