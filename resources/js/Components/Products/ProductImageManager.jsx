import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Star, Trash2, Undo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ACCEPTED_TYPES = 'image/jpeg,image/jpg,image/png,image/webp';

/**
 * Product gallery editor: existing Spatie media, pending uploads and the legacy image.
 */
export default function ProductImageManager({
    existingImages = [],
    legacyImage = null,
    removedMediaIds = [],
    pendingFiles = [],
    coverMediaId = null,
    removeLegacy = false,
    errors = {},
    maxFiles = 6,
    maxSizeKb = 10240,
    onAddFiles,
    onRemovePending,
    onToggleExisting,
    onSetCover,
    onToggleLegacy,
}) {
    const { t } = useTranslation();
    const [previews, setPreviews] = useState([]);

    useEffect(() => {
        const urls = pendingFiles.map((file) => URL.createObjectURL(file));
        setPreviews(urls);

        return () => urls.forEach((url) => URL.revokeObjectURL(url));
    }, [pendingFiles]);

    const removed = useMemo(() => new Set(removedMediaIds.map(Number)), [removedMediaIds]);
    const activeExisting = existingImages.filter((image) => !removed.has(Number(image.id)));
    const total = activeExisting.length + pendingFiles.length;
    const remaining = Math.max(0, maxFiles - total);
    const cover = coverMediaId ?? activeExisting[0]?.id ?? null;
    const fileError =
        errors.images ?? Object.entries(errors).find(([key]) => key.startsWith('images.'))?.[1] ?? null;

    const handleFiles = (event) => {
        const files = Array.from(event.target.files ?? []);
        if (files.length > 0) onAddFiles(files.slice(0, remaining));
        event.target.value = '';
    };

    const tileClass = 'group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50';

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-slate-600">{t('products.images')}</div>
                <div className="text-[11px] text-slate-400">
                    {total} / {maxFiles}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {existingImages.map((image) => {
                    const isRemoved = removed.has(Number(image.id));
                    const isCover = Number(cover) === Number(image.id);

                    return (
                        <div
                            key={image.id}
                            className={`${tileClass} ${isRemoved ? 'opacity-45 grayscale' : ''}`}
                        >
                            <img
                                src={image.thumb_url || image.url}
                                alt={image.name || ''}
                                loading="lazy"
                                className="h-full w-full object-cover"
                            />
                            {isCover && !isRemoved && (
                                <span className="absolute left-1.5 top-1.5 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                                    {t('products.cover')}
                                </span>
                            )}
                            <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                                {!isRemoved && image.id !== cover && (
                                    <button
                                        type="button"
                                        onClick={() => onSetCover(image.id)}
                                        title={t('products.setCover')}
                                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md backdrop-blur hover:bg-white"
                                    >
                                        <Star size={13} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => onToggleExisting(image.id)}
                                    title={isRemoved ? t('products.restoreImage') : t('products.removeImage')}
                                    className={`flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur hover:bg-white ${
                                        isRemoved ? 'text-indigo-600' : 'text-red-600'
                                    }`}
                                >
                                    {isRemoved ? <Undo2 size={13} /> : <Trash2 size={13} />}
                                </button>
                            </div>
                        </div>
                    );
                })}

                {previews.map((url, index) => (
                    <div key={`pending-${index}`} className={tileClass}>
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-slate-900/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {t('products.pendingImage')}
                        </span>
                        <button
                            type="button"
                            onClick={() => onRemovePending(index)}
                            title={t('products.removeImage')}
                            className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-red-600 shadow-md backdrop-blur hover:bg-white"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                ))}

                {remaining > 0 && (
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center transition hover:border-indigo-300 hover:bg-indigo-50/50">
                        <input
                            type="file"
                            accept={ACCEPTED_TYPES}
                            multiple
                            onChange={handleFiles}
                            className="hidden"
                        />
                        <ImagePlus size={20} className="mb-1 text-slate-400" />
                        <span className="px-1 text-[11px] leading-tight text-slate-500">{t('products.addImages')}</span>
                    </label>
                )}
            </div>

            <div className="text-[11px] leading-relaxed text-slate-400">
                {t('products.imagesHelp', { size: Math.round(maxSizeKb / 1024), count: maxFiles })}
            </div>

            {legacyImage && (
                <div
                    className={`mt-1 flex items-center gap-3 rounded-xl border border-slate-200 p-2 ${
                        removeLegacy ? 'opacity-60' : ''
                    }`}
                >
                    <img
                        src={legacyImage}
                        alt=""
                        className={`h-12 w-12 rounded-lg object-cover ${removeLegacy ? 'grayscale' : ''}`}
                    />
                    <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-700">{t('products.legacyImage')}</div>
                        <div className="truncate text-[11px] text-slate-400">{legacyImage}</div>
                    </div>
                    <button
                        type="button"
                        onClick={onToggleLegacy}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${
                            removeLegacy
                                ? 'text-indigo-600 hover:bg-indigo-50'
                                : 'text-red-600 hover:bg-red-50'
                        }`}
                    >
                        {removeLegacy ? <Undo2 size={13} /> : <Trash2 size={13} />}
                        {removeLegacy ? t('products.restoreImage') : t('products.removeImage')}
                    </button>
                </div>
            )}

            {fileError && <div className="text-xs text-red-600">{fileError}</div>}
        </div>
    );
}
