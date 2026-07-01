import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";
import { uploadImage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { toast } from "sonner";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  accept?: string;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  folder,
  accept = "image/*,video/*",
  className = "",
}: ImageUploadProps) {
  const { t } = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, folder);
      if (url) {
        onChange(url);
        toast.success(t("imageUpload.success"));
      } else {
        toast.error(t("imageUpload.failed"));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("imageUpload.failedFallback");
      toast.error(message);
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {value && (
        <div className="relative inline-block">
          {accept.includes("video") ? (
            <video src={value} className="h-24 w-24 rounded-xl object-cover" />
          ) : (
            <img src={value} alt="" className="h-24 w-24 rounded-xl object-cover" />
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <div className="flex flex-col gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFile}
        />
        <Button
          type="button"
          variant="default"
          size="lg"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="w-full min-h-[48px] text-base font-medium touch-manipulation"
        >
          <Upload className="mr-2 h-5 w-5" />
          {uploading ? t("imageUpload.uploading") : t("imageUpload.addPhoto")}
        </Button>
      </div>
    </div>
  );
}
