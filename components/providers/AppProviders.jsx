"use client";

import { ToastContainer } from "react-toastify";
import "react-toastify/ReactToastify.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ConfirmProvider } from "@/components/providers/ConfirmProvider";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import { StoreStatusProvider } from "@/components/providers/StoreStatusProvider";
import { ThemeProvider, useTheme } from "@/components/providers/ThemeProvider";

// toast با تم سایت هماهنگ می‌شه
function ThemedToasts() {
  const { resolved } = useTheme();
  return (
    <ToastContainer
          rtl
          position="top-center"
          autoClose={4000}
          limit={3}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss={false}
          theme={resolved}
          toastClassName="sabah-toast"
          // روی موبایل نوار پایین (BottomNav) هست؛ toast بالا می‌شینه تا روش نیفته
        />
  );
}

// همه‌ی providerهای سمت کلاینت یک‌جا: تم + احراز هویت + دیالوگ تأیید + وضعیت فروشگاه + toast
export default function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ConfirmProvider>
          <StoreStatusProvider>
            <NotificationProvider>
              {children}
              <ThemedToasts />
            </NotificationProvider>
          </StoreStatusProvider>
        </ConfirmProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
