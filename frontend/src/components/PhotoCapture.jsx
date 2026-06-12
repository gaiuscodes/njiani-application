import { useState, useRef, useEffect } from 'react';

const PhotoCapture = ({ 
  label, 
  name, 
  value, 
  onChange, 
  required = false,
  accept = 'image/*',
  maxSizeMB = 10 
}) => {
  const [preview, setPreview] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Update preview when value changes
  useEffect(() => {
    let previewUrl = null;
    
    if (value && value instanceof File) {
      previewUrl = URL.createObjectURL(value);
      setPreview(previewUrl);
    } else if (value && typeof value === 'string') {
      setPreview(value);
    } else {
      setPreview(null);
    }
    
    // Cleanup: revoke object URL when component unmounts or value changes
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [value]);

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`Image size must be less than ${maxSizeMB}MB`);
      return;
    }

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    
    // Call onChange with the file - create a synthetic event that matches native file input
    if (onChange) {
      // Create a FileList-like object
      const fileList = Object.assign([file], {
        length: 1,
        item: (index) => index === 0 ? file : null
      });
      
      const syntheticEvent = {
        target: {
          name,
          files: fileList,
          value: file
        }
      };
      onChange(syntheticEvent);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Camera error:', error);
      setCameraError('Unable to access camera. Please check permissions or use file selection instead.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Create a File object from the blob
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        handleFileSelect(file);
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  const removePhoto = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onChange) {
      onChange({ target: { name, files: [], value: null } });
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-gray-300 mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>

      {/* Preview */}
      {preview && (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-contain rounded-lg border border-dark-600 bg-dark-800"
          />
          <button
            type="button"
            onClick={removePhoto}
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-2"
            title="Remove photo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Action Buttons */}
      {!preview && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={startCamera}
            className="btn-secondary flex-1 py-2 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Take Photo
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary flex-1 py-2 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Choose File
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        name={name}
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg p-6 max-w-md w-full border border-dark-700">
            <h3 className="text-xl font-bold text-white mb-4">Take Photo</h3>
            
            {cameraError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm">{cameraError}</p>
              </div>
            )}

            <div className="relative bg-black rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={capturePhoto}
                className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Capture
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="btn-secondary py-3 px-6"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-1">
        Max size: {maxSizeMB}MB. Click "Take Photo" to use camera or "Choose File" to select from device.
      </p>
    </div>
  );
};

export default PhotoCapture;

