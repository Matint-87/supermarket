"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ConfirmContext = createContext(null);

/**
 * جایگزین confirm() مرورگر. استفاده:
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "حذف محصول", description: "...", confirmText: "حذف" }))) return;
 * (با یک رشته هم کار می‌کنه: await confirm("مطمئنی؟"))
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, options: {} });
  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    const opts = typeof options === "string" ? { description: options } : options ?? {};
    return new Promise((resolve) => {
      resolver.current?.(false); // اگه دیالوگ قبلی هنوز بازه، اون رو «انصراف» حساب کن
      resolver.current = resolve;
      setState({ open: true, options: opts });
    });
  }, []);

  function settle(result) {
    resolver.current?.(result);
    resolver.current = null;
    setState((s) => ({ ...s, open: false }));
  }

  const { title = "مطمئنی؟", description, confirmText = "تأیید", cancelText = "انصراف" } = state.options;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={state.open} onOpenChange={(open) => !open && settle(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction variant="default" onClick={() => settle(true)}>
              {confirmText}
            </AlertDialogAction>
            <AlertDialogCancel onClick={() => settle(false)}>{cancelText}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm باید داخل <ConfirmProvider> استفاده بشه");
  return ctx;
}
