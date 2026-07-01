import { notify } from "@/lib/toast";

function isMobileShareDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function copyText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function openShareTarget(url: string) {
  if (url.startsWith("mailto:") || url.startsWith("sms:")) {
    window.location.href = url;
    return;
  }

  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function sharePdfDocument(options: {
  blob: Blob;
  fileName: string;
  title: string;
  text: string;
  openUrl?: string;
  downloadTitle?: string;
  downloadDescription?: string;
  copyText?: string;
}) {
  const {
    blob,
    fileName,
    title,
    text,
    openUrl,
    downloadTitle = "PDF downloaded",
    downloadDescription = "Attach the downloaded file before sending.",
    copyText: textToCopy,
  } = options;
  const file = new File([blob], fileName, { type: "application/pdf" });

  if (
    isMobileShareDevice()
    && typeof navigator.share === "function"
    && typeof navigator.canShare === "function"
    && navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title, text });
      notify.success({
        title: "Ready to send",
        description: "Choose an app to share the PDF.",
      });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  }

  downloadBlob(blob, fileName);

  if (textToCopy) {
    await copyText(textToCopy);
  }

  if (openUrl) {
    openShareTarget(openUrl);
  }

  notify.success({
    title: downloadTitle,
    description: downloadDescription,
  });
}

export async function downloadPdfAndCopyMessage(options: {
  blob: Blob;
  fileName: string;
  message: string;
  downloadTitle?: string;
}) {
  const {
    blob,
    fileName,
    message,
    downloadTitle = "PDF downloaded",
  } = options;

  downloadBlob(blob, fileName);
  await copyText(message);

  notify.success({
    title: downloadTitle,
    description: "PDF saved and message copied. Attach the file when you send it.",
  });
}
