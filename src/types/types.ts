/* eslint-disable @typescript-eslint/no-unused-vars */

type ModelFormData  = {
  model: string;
  date: string;
  time: string;
  timezone: string;
  imageUrl?: string;
  imageName?: string;
  imageFile?: File;
  paid: boolean;
  customImage: boolean;
  imageId: string;
  noOfTemplate: number;
  customRequest: boolean;
  customDetails: string;
}

type ModelsDropdownProps = {
  formData: ModelFormData;
  setFormData: React.Dispatch<React.SetStateAction<ModelFormData>>;
  isLoading: boolean;
  isFetchingImage: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webhookData?: any;
};


type WebhookResponse = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  error?: string;
}

type GoogleDriveFile = {
  id: string;
  name: string;
  mimeType?: string;
  isFolder?: boolean;
  thumbnailLink?: string;
  webContentLink?: string;
}

type FolderInfo = {
  id: string;
  name: string;
}
