import React from 'react';

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  caption?: string;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Field Evidence Photo',
  caption,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative max-w-3xl w-full bg-surface-container-lowest rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">photo</span>
            <h3 className="font-semibold text-on-surface text-[16px]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="relative bg-black flex items-center justify-center max-h-[70vh] overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[70vh] w-auto max-w-full object-contain"
          />
        </div>

        {caption && (
          <div className="p-3 bg-surface-container-low text-[13px] text-secondary border-t border-surface-container flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">info</span>
            <span>{caption}</span>
          </div>
        )}
      </div>
    </div>
  );
};
