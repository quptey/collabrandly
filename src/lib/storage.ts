import { supabase } from "@/integrations/supabase/client";

const IMAGE_BUCKET = "images";

export async function uploadImage(file: File, path: string): Promise<string | null> {
  try {
    if (!file) throw new Error("No file provided");

    const fileExt = file.name.split(".").pop() ?? "jpg";
    const fileName = `${path}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(fileName, file, { upsert: false });

    if (uploadError) {
      if (uploadError.message.includes("bucket") || uploadError.message.includes("not found")) {
        throw new Error(
          `Bucket "${IMAGE_BUCKET}" не найден. Запусти миграцию 20260627000000_brand_dashboard_features.sql в Supabase SQL Editor.`,
        );
      }
      if (uploadError.message.includes("duplicate")) {
        throw new Error("Файл уже существует.");
      }
      if (uploadError.message.includes("size") || uploadError.message.includes("large")) {
        throw new Error("Файл слишком большой (макс. 10MB).");
      }
      if (uploadError.message.includes("policy") || uploadError.message.includes("permission")) {
        throw new Error("Нет прав на загрузку. Проверь Storage policies.");
      }
      throw uploadError;
    }

    const { data: urlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      throw new Error("Не удалось получить публичный URL.");
    }

    return urlData.publicUrl;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка";
    console.error("Upload failed:", { message, file: file.name, path });
    throw new Error(message);
  }
}

export function getImageUrl(path: string): string {
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? "";
}
