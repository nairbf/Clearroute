'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  Image as ImageIcon, 
  MapPin, 
  Loader2,
  AlertTriangle,
  Check,
  Navigation,
  Map
} from 'lucide-react';
import { useCreateReport, useUploadPhoto } from '@/hooks/useReports';
import { cn, isWithinCNYBounds } from '@/lib/utils';
import { CONDITIONS, PASSABILITIES, COUNTIES, CNY_CENTER } from '@/types';
import { LocationPicker } from './LocationPicker';
import { useToast } from '@/components/Toast';
import type { RoadCondition, Passability, County } from '@/types';

interface PostModalProps {
  open: boolean;
  onClose: () => void;
}

export function PostModal({ open, onClose }: PostModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createReportMutation = useCreateReport();
  const uploadPhotoMutation = useUploadPhoto();

  const [step, setStep] = useState<'location' | 'form' | 'success'>('location');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [condition, setCondition] = useState<RoadCondition | null>(null);
  const [passability, setPassability] = useState<Passability | null>(null);
  const [county, setCounty] = useState<County | null>(null);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [roadName, setRoadName] = useState<string | null>(null);
  const [locationDisplay, setLocationDisplay] = useState<string>('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user location on open
  useEffect(() => {
    if (open && !location) {
      getInitialLocation();
    }
  }, [open]);

  // Reset form when closed
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('location');
        setPhoto(null);
        setPhotoPreview(null);
        setPhotoUrl(null);
        setCondition(null);
        setPassability(null);
        setCounty(null);
        setNotes('');
        setLocation(null);
        setRoadName(null);
        setLocationDisplay('');
        setError(null);
      }, 300);
    }
  }, [open]);

  const getInitialLocation = () => {
    if (!navigator.geolocation) {
      setLocation(CNY_CENTER);
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        setGettingLocation(false);
      },
      () => {
        setLocation(CNY_CENTER);
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleLocationSelect = (data: {
    lat: number;
    lng: number;
    roadName: string | null;
    locationDisplay: string;
    county: County | null;
  }) => {
    setLocation({ lat: data.lat, lng: data.lng });
    setRoadName(data.roadName);
    setLocationDisplay(data.locationDisplay);
    if (data.county) {
      setCounty(data.county);
    }
    setStep('form');
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setUploadingPhoto(true);
      try {
        const result = await uploadPhotoMutation.mutateAsync(file);
        setPhotoUrl(result.url);
      } catch (err) {
        setError('Failed to upload photo. You can still submit without it.');
        setPhoto(null);
        setPhotoPreview(null);
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!condition || !passability || !county || !location) {
      setError('Please fill in all required fields');
      return;
    }

    setError(null);

    try {
      await createReportMutation.mutateAsync({
        lat: location.lat,
        lng: location.lng,
        location_name: locationDisplay || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
        road_name: roadName || undefined,
        county,
        condition,
        passability,
        notes: notes || undefined,
        photo_urls: photoUrl ? [photoUrl] : undefined,
      });

      setStep('success');
      showToast('success', 'Report submitted successfully!');
      
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
      showToast('error', 'Failed to submit report');
    }
  };

  const isSubmitting = createReportMutation.isPending;
  const canSubmit = condition && passability && county && location && !isSubmitting && !uploadingPhoto;

  if (!open) return null;

  // Loading initial location
  if (gettingLocation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-8 mx-4 text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Getting your location...</p>
        </div>
      </div>
    );
  }

  // Step 1: Location picker
  if (step === 'location') {
    return (
      <LocationPicker
        initialLocation={location}
        onLocationSelect={handleLocationSelect}
        onClose={onClose}
      />
    );
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative bg-white rounded-2xl p-8 mx-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Report Submitted!</h2>
          <p className="text-slate-600">Thanks for helping keep CNY roads safe.</p>
        </div>
      </div>
    );
  }

  // Step 2: Report form
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

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

          {/* Selected Location (tap to change) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              📍 Location
            </label>
            <button
              onClick={() => setStep('location')}
              className="w-full flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                {roadName ? (
                  <>
                    <p className="font-semibold text-slate-900 truncate">{roadName}</p>
                    <p className="text-sm text-slate-500 truncate">{locationDisplay}</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-slate-700 truncate">{locationDisplay}</p>
                    <p className="text-sm text-slate-500">Tap to select a road</p>
                  </>
                )}
              </div>
              <Map size={20} className="text-blue-600 flex-shrink-0" />
            </button>
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
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <Loader2 size={32} className="animate-spin text-white" />
                  </div>
                )}
                {!uploadingPhoto && photoUrl && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Check size={12} /> Uploaded
                  </div>
                )}
                <button
                  onClick={() => {
                    setPhoto(null);
                    setPhotoPreview(null);
                    setPhotoUrl(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute('capture', 'environment');
                      fileInputRef.current.click();
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-8 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
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
                  className="flex-1 flex items-center justify-center gap-2 py-8 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
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
              {county && <span className="text-green-600 text-xs ml-1">(auto-detected)</span>}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COUNTIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCounty(c.value)}
                  className={cn(
                    'py-2.5 px-3 rounded-lg text-sm font-medium border-2 transition-colors',
                    county === c.value
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
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
                    'py-3 px-3 rounded-lg text-sm font-medium border-2 transition-colors text-center',
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
              placeholder="Describe what you see... (e.g., 'Plowed but icy patches near the bridge')"
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
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
              'w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
              canSubmit 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Submitting...
              </>
            ) : uploadingPhoto ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Uploading photo...
              </>
            ) : (
              'Submit Report'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}