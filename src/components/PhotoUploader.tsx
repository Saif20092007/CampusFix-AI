import React, { useRef, useState } from 'react';
import { api } from '../services/api';

export interface UploadedFileState {
  attachment_id: number;
  file_name: string;
  file_size: number;
  file_type: string;
  previewUrl: string;
}

interface PhotoUploaderProps {
  files: UploadedFileState[];
  onFilesChange: (files: UploadedFileState[]) => void;
  maxFiles?: number;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  files,
  onFilesChange,
  maxFiles = 3,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    if (files.length >= maxFiles) {
      setErrorMsg(`Maximum ${maxFiles} photos allowed.`);
      return;
    }

    const file = selected[0];
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setErrorMsg('Please upload a JPG, PNG or WEBP image.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg('Image size must be under 3 MB.');
      return;
    }

    setErrorMsg(null);
    setIsUploading(true);

    try {
      const res = await api.uploadPhoto(file);
      const previewUrl = URL.createObjectURL(file);
      onFilesChange([
        ...files,
        {
          attachment_id: res.attachment_id,
          file_name: res.file_name,
          file_size: res.file_size,
          file_type: res.file_type,
          previewUrl,
        },
      ]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload photo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const next = [...files];
    next.splice(index, 1);
    onFilesChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="font-medium text-[14px] text-on-surface flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-primary">add_a_photo</span>
          <span>Complaint Photo</span>
          <span className="text-[11px] text-secondary font-normal">(Optional · Max {maxFiles})</span>
        </label>
        <span className="text-[11px] text-secondary">{files.length} / {maxFiles}</span>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-error-container text-on-error-container text-[12px] flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-error">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid of photos + Add button */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        {files.map((file, idx) => (
          <div
            key={file.attachment_id || idx}
            className="relative aspect-square rounded-xl overflow-hidden bg-surface-container border border-surface-container-high group shadow-sm"
          >
            <img
              src={file.previewUrl}
              alt={file.file_name}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-on-surface/70 hover:bg-error text-surface flex items-center justify-center transition-colors"
              title="Remove photo"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
            <div className="absolute bottom-1 left-1 right-1 bg-on-surface/80 text-surface text-[10px] px-1 py-0.5 rounded truncate backdrop-blur-sm">
              {(file.file_size / 1024).toFixed(0)} KB
            </div>
          </div>
        ))}

        {files.length < maxFiles && (
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-outline-variant hover:border-primary bg-surface-container-lowest hover:bg-surface-container-low transition-colors flex flex-col items-center justify-center gap-1 text-secondary hover:text-primary active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isUploading ? (
              <span className="material-symbols-outlined text-[24px] animate-spin text-primary">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-[24px]">add_photo_alternate</span>
            )}
            <span className="text-[11px] font-medium">
              {isUploading ? 'Uploading...' : 'Add Photo'}
            </span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleSelectFile}
        className="hidden"
      />
    </div>
  );
};
