"use client";

import { ToastActionElement, ToastProps } from "@/components/ui/toast";
import {
    useToast as useSonner,
    type ToastOptions as SonnerToastOptions,
} from "@/components/ui/use-sonner";

const TOAST_LIMIT = 10;
const TOAST_REMOVE_DELAY = 1000;

type ToasterToast = ToastProps & {
    id: string;
    title?: React.ReactNode;
    description?: React.ReactNode;
    action?: ToastActionElement;
};

const actionTypes = {
    ADD_TOAST: "ADD_TOAST",
    UPDATE_TOAST: "UPDATE_TOAST",
    DISMISS_TOAST: "DISMISS_TOAST",
    REMOVE_TOAST: "REMOVE_TOAST",
} as const;

type ActionType = typeof actionTypes;

type Action =
    | {
        type: ActionType["ADD_TOAST"];
        toast: ToasterToast;
    }
    | {
        type: ActionType["UPDATE_TOAST"];
        toast: Partial<ToasterToast>;
    }
    | {
        type: ActionType["DISMISS_TOAST"];
        toastId?: ToasterToast["id"];
    }
    | {
        type: ActionType["REMOVE_TOAST"];
        toastId?: ToasterToast["id"];
    };

interface State {
    toasts: ToasterToast[];
}

export type ToastOptions = Omit<ToasterToast, "id">;

export function useToast() {
    const { toast: sonnerToast, dismiss, toast } = useSonner();

    function showToast(props: ToastOptions) {
        const {
            title,
            description,
            variant,
            action,
            ...toastProps
        } = props;

        const toastOptions: SonnerToastOptions = {
            ...toastProps,
            className: `${variant === "destructive" ? "bg-destructive text-destructive-foreground" : ""} ${props.className || ""}`,
        };

        return toast(title as string, {
            ...toastOptions,
            description: description,
            action: action ? { label: action.altText || "", onClick: action.onClick } : undefined,
        });
    }

    return {
        toast: showToast,
        dismiss,
    };
}
