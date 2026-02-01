'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  Image as ImageIcon, 
  MapPin, 
  Loader2,
  AlertTriangle 
} from 'lucide-react';
import { useCreateReport, useUploadPhoto } from '@/hooks/useReports';
import { cn, isWithinCNYBounds } from '@/lib/utils';
import { CONDITIONS, PASSABILITIES, COUNTIES, CNY_CENTER } from '@/types';
import type { RoadCondition, Passability, County } from '@/types';

interface PostModalProps {
  open: boolean;
  onClose: () => void;
}

export function PostModal({ open, onClose }: PostModalProps) {
  const [step, setStep] = useState<'form' | 'location'>('form');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [condition, setCondition] = useState<RoadCondition | null>(null);
  const [passability, setPassability] = useState<Passability | null>(null);
  const [county, setCounty] = useState<County | null>(null);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const createReport = useCreateReport();
  const uploadPhoto = useUploadPhoto();

  // Get user location on open
  useEffect(() => {
    if (open && !location) {
      getLocation();
    }
  }, [open]);

  // Reset form when closed
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('form');
        setPhoto(null);
        setPhotoPreview(null);
        setCondition(null);
        setPassability(null);
        setCounty(null);
        setNotes('');
        setLocation(null);
        setLocationName('');
        setError(null);
      }, 300);
    }
  }, [open]);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        if (!isWithinCNYBounds(latitude, longitude)) {
          setError('Your location appears to be outside Central NY. Please adjust the pin.');
        }
        
        setLocation({ lat: latitude, lng: longitude });
        setGettingLocation(false);
        
        // TODO: Reverse geocode to get location name
        setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      },
      (err) => {
        setError('Unable to get your location. Please enter it manually.');
        setGettingLocation(false);
        // Default to Syracuse
        setLocation(CNY_CENTER);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!condition || !passability || !county || !location) {
      setError('Please fill in all required fields');
      return;
    }

    setError(null);

    try {
      let photoUrl: string | undefined;

      // Upload photo if exists
      if (photo) {
        const result = await uploadPhoto.mutateAsync(photo);
        photoUrl = result.url;
      }

      // Create report
      await createReport.mutateAsync({
        lat: location.lat,
        lng: location.lng,
        location_name: locationName || undefined,
        county,
        condition,
        passability,
        notes: notes || undefined,
        photo_ids: photoUrl ? [photoUrl] : undefined,
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    }
  };

  const isSubmitting = createReport.isPending || uploadPhoto.isPending;
  const canSubmit = condition && passability && county && location && !isSubmitting;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold">New Report</h2>
          <button
            onClick={onClose}
            className="p-2 -m-2 text-slate-500 hover:text-slate-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              📍 Location
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-slate-100 rounded-lg text-sm">
                {gettingLocation ? (
                  <span className="flex items-center gap-2 text-slate-500">
                    <Loader2 size={16} className="animate-spin" />
                    Getting location...
                  </span>
                ) : location ? (
                  <span className="text-slate-700">
                    {locationName || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
                  </span>
                ) : (
                  <span className="text-slate-500">Location not set</span>
                )}
              </div>
              <button
                onClick={getLocation}
                disabled={gettingLocation}
                className="btn-secondary !py-2"
              >
                <MapPin size={18} />
              </button>
            </div>
          </div>

          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              📷 Photo <span className="text-slate-400 font-normal">(optional but helps!)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handlePhotoChange}
              className="hidden"
            />
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  onClick={() => {
                    setPhoto(null);
                    setPhotoPreview(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-8 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-brand-primary hover:text-brand-primary transition-colors"
                >
                  <Camera size={24} />
                  <span>Take Photo</span>
                </button>
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('capture');
                      fileInputRef.current.click();
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-8 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-brand-primary hover:text-brand-primary transition-colors"
                >
                  <ImageIcon size={24} />
                  <span>Gallery</span>
                </button>
              </div>
            )}
            <p className="text-xs text-slate-500 mt-2">
              ⚠️ Don't photograph people or license plates
            </p>
          </div>

          {/* County */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              County *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COUNTIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCounty(c.value)}
                  className={cn(
                    'py-2.5 px-3 rounded-lg text-sm font-medium border-2 transition-colors',
                    county === c.value
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Road Condition *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCondition(c.value)}
                  className={cn(
                    'py-3 px-3 rounded-lg text-sm font-medium border-2 transition-colors',
                    condition === c.value
                      ? 'border-2'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  )}
                  style={condition === c.value ? {
                    borderColor: c.color,
                    backgroundColor: `${c.color}20`,
                    color: c.color,
                  } : {}}
                >
                  <span className="text-lg">{c.emoji}</span>
                  <br />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Passability */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Can you drive it? *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PASSABILITIES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPassability(p.value)}
                  className={cn(
                    'py-4 px-3 rounded-lg text-sm font-medium border-2 transition-colors',
                    passability === p.value
                      ? 'border-2'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  )}
                  style={passability === p.value ? {
                    borderColor: p.color,
                    backgroundColor: `${p.color}20`,
                    color: p.color,
                  } : {}}
                >
                  <span className="text-xl">{p.icon}</span>
                  <br />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what you see..."
              rows={3}
              maxLength={500}
              className="input resize-none"
            />
            <p className="text-xs text-slate-400 mt-1 text-right">
              {notes.length}/500
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 safe-bottom">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'w-full btn-primary',
              !canSubmit && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={20} className="animate-spin" />
                Submitting...
              </span>
            ) : (
              'Submit Report'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
