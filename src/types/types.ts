/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

type ModelFormData = {
  model?: string;
  date?: string;
  time?: string;
  timezone?: string;
  imageUrl?: string;
  imageName?: string;
  imageFile?: File;
  paid?: boolean;
  customImage?: boolean;
  imageId?: string;
  noOfTemplate?: number;
  customRequest?: boolean;
  customDetails?: string;
  type?: string;
  croppedImage?: string | null;
  templatePosition?: string;
  options?: string[];
  header?: string;
  tip?: number;
  gets?: number;
  croppedImageLeft?: string | null;
  croppedImageRight?: string | null;
  datetmz?: string | null;
};

type ModelsDropdownProps = {
  formData: ModelFormData;
  setFormData: React.Dispatch<React.SetStateAction<ModelFormData>>;
  isLoading: boolean;
  isFetchingImage?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webhookData?: any;
  error?: string;
  setFieldErrors?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
};

type WebhookResponse = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  error?: string;
};

type GoogleDriveFile = {
  id: string;
  name: string;
  mimeType?: string;
  isFolder?: boolean;
  thumbnailLink?: string;
  webViewLink?: string;
};

type FolderInfo = {
  id: string;
  name: string;
};

type Model = {
  name: string;
  profile: string;
  status: string;
};

type ModelCardProps = {
  model: Model;
  selectedModel: string | null;
  setSelectedModel: React.Dispatch<React.SetStateAction<string | null>>;
};

type Layout =
  | "Single"
  | "Side by Side"
  | "Horizontal Triptych"
  | "Vertical Triptych"
  | "2x2 Grid";

  type BlurSettings = {
  blurType: "gaussian" | "pixelated" | "mosaic";
  blurIntensity: number;
  brushSize: number;
};

type GifSettings = {
  maxDuration: number;
  fps: number;
  quality: number;
};