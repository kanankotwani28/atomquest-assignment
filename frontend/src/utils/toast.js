import toast from "react-hot-toast";

export const toastSuccess = (message) =>
  toast.success(message, {
    style: {
      background: "rgba(16,185,129,0.12)",
      border: "1px solid rgba(16,185,129,0.25)",
      color: "#10B981",
      fontSize: 13,
      borderRadius: 10,
      padding: "12px 16px",
    },
    iconTheme: { primary: "#10B981", secondary: "rgba(16,185,129,0.1)" },
  });

export const toastError = (message) =>
  toast.error(message, {
    style: {
      background: "rgba(239,68,68,0.12)",
      border: "1px solid rgba(239,68,68,0.25)",
      color: "#EF4444",
      fontSize: 13,
      borderRadius: 10,
      padding: "12px 16px",
    },
    iconTheme: { primary: "#EF4444", secondary: "rgba(239,68,68,0.1)" },
  });

export const toastInfo = (message) =>
  toast(message, {
    style: {
      background: "rgba(59,130,246,0.12)",
      border: "1px solid rgba(59,130,246,0.25)",
      color: "#60A5FA",
      fontSize: 13,
      borderRadius: 10,
      padding: "12px 16px",
    },
  });